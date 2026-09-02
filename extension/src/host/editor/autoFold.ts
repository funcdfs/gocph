import * as vscode from 'vscode';
import { logger } from '../logger';
import { settings } from '../settings';
import { SKELETON_START, skeletonInsertionLine } from './skeleton';

/**
 * 每次折叠尝试前等待的毫秒数。折叠区域要等编辑器重新向 FoldingRangeProvider 要一遍才存在，
 * 而 VS Code 会等所有 provider（含 gopls）都返回才更新；gopls 冷启动时这一步可能拖到好几秒，
 * 所以尾部留了较长的重试，累计约 10 秒。
 */
const ATTEMPT_DELAYS = [150, 250, 400, 600, 1000, 1500, 2500, 4000];

/** 发出折叠命令后，等视图刷新再确认是否真的折上了 */
const VERIFY_DELAY = 80;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** 折叠命令只作用于当前活动编辑器；文件不在前台时返回 undefined，避免折到别的文件 */
function activeEditorFor(uriStr: string): vscode.TextEditor | undefined {
    const editor = vscode.window.activeTextEditor;
    return editor && editor.document.uri.toString() === uriStr ? editor : undefined;
}

/** 折叠后 line 之后的行被藏起来，因此某个可见区间恰好在 line 结束 */
function isFolded(editor: vscode.TextEditor, line: number): boolean {
    return line < editor.document.lineCount - 1 && editor.visibleRanges.some((range) => range.end.line === line);
}

/** 目标行仍然是骨架的起始标记时才允许折叠，避免用户后续编辑导致误折叠 */
function isStillSkeletonStart(document: vscode.TextDocument, line: number): boolean {
    return line < document.lineCount && SKELETON_START.test(document.lineAt(line).text);
}

/**
 * 折叠 line 处的 region。
 *
 * 只通过 `selectionLines` 指定目标，全程不动 editor.selection：
 * 移动光标会终止正在进行的 snippet 会话，tabstop / $0 全部失效。
 *
 * 每次尝试后都确认结果：折上了就结束，之后不再碰它，用户手动展开不会被折回去；
 * 没折上说明折叠区域还没算出来，按 ATTEMPT_DELAYS 继续等。
 */
async function foldSkeleton(uriStr: string, line: number): Promise<void> {
    for (const delay of ATTEMPT_DELAYS) {
        await sleep(delay);

        const editor = activeEditorFor(uriStr);
        if (!editor) {
            continue;
        }
        if (!isStillSkeletonStart(editor.document, line)) {
            logger.log(`[autoFold] 第 ${line} 行已不是骨架标记，放弃折叠`);
            return;
        }
        if (isFolded(editor, line)) {
            logger.log(`[autoFold] 第 ${line} 行已折叠`);
            return;
        }

        try {
            await vscode.commands.executeCommand('editor.fold', { levels: 1, selectionLines: [line] });
        } catch (err) {
            logger.error(`[autoFold] 折叠命令失败: ${String(err)}`);
        }

        await sleep(VERIFY_DELAY);
        const after = activeEditorFor(uriStr);
        if (after && isFolded(after, line)) {
            logger.log(`[autoFold] 第 ${line} 行折叠成功`);
            return;
        }
    }
    logger.warn(`[autoFold] 第 ${line} 行多次尝试后仍未折叠，放弃`);
}

/** 插入 cp / tt / ttna 模板后自动折叠 `// #region main` 骨架，只留下 solve() */
export function registerAutoFold(): vscode.Disposable {
    return vscode.workspace.onDidChangeTextDocument((event) => {
        const document = event.document;
        if (document.languageId !== 'go' || document.uri.scheme !== 'file') {
            return;
        }

        for (const change of event.contentChanges) {
            const line = skeletonInsertionLine({
                text: change.text,
                rangeLength: change.rangeLength,
                startLine: change.range.start.line,
                endLine: change.range.end.line,
            });
            if (line === -1) {
                continue;
            }
            if (!settings.autoFold()) {
                return;
            }
            logger.log(`[autoFold] 检测到骨架插入，目标行 ${line}`);
            void foldSkeleton(document.uri.toString(), line);
            return;
        }
    });
}
