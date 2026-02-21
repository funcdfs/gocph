import * as vscode from 'vscode';
import { debounce } from '../utils/utils';

// 折叠状态缓存 (LRU 策略，最大 5 个)
const foldedCache = new Map<string, number>();
const MAX_CACHE_SIZE = 5;

function updateFoldCache(filePath: string) {
    if (foldedCache.has(filePath)) {
        foldedCache.delete(filePath);
    }
    foldedCache.set(filePath, Date.now());
    if (foldedCache.size > MAX_CACHE_SIZE) {
        const oldestKey = foldedCache.keys().next().value;
        if (oldestKey) foldedCache.delete(oldestKey);
    }
}

/** 清除指定文件的折叠缓存 */
function clearFoldCache(filePath: string) {
    foldedCache.delete(filePath);
}

/**
 * 自动折叠前几行的 region（导出供外部使用）
 */
export async function foldRegionsInActiveEditor(): Promise<number> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return 0;
    const filePath = editor.document.uri.fsPath;

    // 如果已经在缓存中，说明已折叠过，跳过自动折叠
    if (foldedCache.has(filePath)) {
        return 0;
    }

    const count = await processFolding();
    if (count > 0) {
        updateFoldCache(filePath);
    }
    return count;
}

/**
 * 处理折叠逻辑：在前 10 行中查找 #region 并折叠
 */
async function processFolding(): Promise<number> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return 0;

    const document = editor.document;
    const regionStartLines: number[] = [];

    // 性能优化：只在前 10 行中查找 #region 开始行
    const searchLimit = Math.min(10, document.lineCount);
    for (let i = 0; i < searchLimit; i++) {
        const lineText = document.lineAt(i).text.trim();
        if (lineText.startsWith('// #region') || lineText.startsWith('//#region')) {
            regionStartLines.push(i);
        }
    }

    if (regionStartLines.length === 0) return 0;

    // 增加重试机制以应对 Snippet 插入后语言服务未能即刻完成 AST 更新的情况
    const maxRetries = 10;
    const retryDelay = 500;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        // 使用 editor.fold 命令折叠指定行
        await vscode.commands.executeCommand('editor.fold', {
            selectionLines: regionStartLines,
        });

        // 检查折叠是否生效：简单的判断条件是 region 开始的下一行是否变得不可见
        let allFolded = true;
        for (const line of regionStartLines) {
            if (line + 1 < document.lineCount) {
                const nextLineVisible = editor.visibleRanges.some(
                    range => (line + 1) >= range.start.line && (line + 1) <= range.end.line
                );
                if (nextLineVisible) {
                    allFolded = false;
                    break;
                }
            }
        }

        if (allFolded) {
            break;
        }

        // 短暂延迟后重试
        if (attempt < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
    }

    return regionStartLines.length;
}

// 监听文档变化，检测 snippet 插入后自动折叠
const snippetPatterns = ['// #region main', '//#region main'];

export function setupSnippetListener(context: vscode.ExtensionContext) {
    const debouncedFold = debounce(() => {
        // snippet 插入后直接调用折叠
        foldRegionsInActiveEditor();
    }, 300);

    const changeDisposable = vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.document.languageId !== 'go') {
            return;
        }

        // 检测 snippet 插入：如果文档内容包含特定 region 标记
        for (const change of e.contentChanges) {
            // 性能优化：只检测前 50 行的变更，且插入文本长度需超过 10 字符
            if (change.range.start.line >= 50 || change.text.length < 10) {
                continue;
            }

            // 如果插入的内容中包含标记
            const hasRegion = snippetPatterns.some(p => change.text.includes(p));
            if (hasRegion) {
                // 清除该文件的缓存，确保折叠能执行
                clearFoldCache(e.document.uri.fsPath);
                debouncedFold();
                break;
            }
        }
    });
    context.subscriptions.push(changeDisposable);
}
