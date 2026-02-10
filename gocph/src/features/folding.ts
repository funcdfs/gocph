import * as vscode from 'vscode';
import { debounce } from '../utils/utils';

// 公共折叠函数，供内外部调用
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
export function clearFoldCache(filePath: string) {
    foldedCache.delete(filePath);
}

/**
 * 切换折叠状态 (用于手动和快捷键)
 */
export async function toggleRegionsInActiveEditor(): Promise<number> {
    return await processFolding(true);
}

/**
 * 仅执行折叠 (用于自动触发)
 */
export async function foldRegionsInActiveEditor(): Promise<number> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return 0;
    const filePath = editor.document.uri.fsPath;

    // 如果已经在缓存中，说明已折叠过，跳过自动折叠以避免 toggle 导致展开
    if (foldedCache.has(filePath)) {
        return 0;
    }

    const count = await processFolding(false);
    if (count > 0) {
        updateFoldCache(filePath);
    }
    return count;
}

/**
 * 统一处理折叠/切换逻辑
 * @param toggle 是否为切换模式。false 则仅执行折叠
 */
async function processFolding(toggle: boolean): Promise<number> {
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

    // 使用 selectionLines 参数精确指定要折叠的行号
    // 不修改 editor.selections，避免破坏 VS Code 内部折叠状态
    if (toggle) {
        await vscode.commands.executeCommand('editor.toggleFold', {
            selectionLines: regionStartLines,
        });
    } else {
        await vscode.commands.executeCommand('editor.fold', {
            selectionLines: regionStartLines,
        });
    }

    return regionStartLines.length;
}

// 监听文档变化，检测 snippet 插入后自动折叠
const snippetPatterns = ['// #region main', '//#region main'];

export function setupSnippetListener(context: vscode.ExtensionContext) {
    const debouncedFold = debounce(() => {
        // snippet 插入后直接调用 processFolding，绕过 foldedCache
        processFolding(false);
    }, 300);

    const changeDisposable = vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.document.languageId !== 'go') {
            return;
        }

        // 简单检测：如果文档内容包含特定 region 标记，且似乎是刚插入的（这里简化处理，不做严格 diff）
        // 对于 snippet 触发，用户通常是一次性插入大段代码
        for (const change of e.contentChanges) {
            // 性能优化：只检测前 50 行的变更，且插入文本长度需超过 10 字符
            // 这能过滤掉大部分普通输入和非头部编辑
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
