import * as vscode from 'vscode';
import { getAutoFoldPref } from '../common/preferences';

/** 模板骨架的折叠起始标记，与 snippets/go.json 中的 `// #region main` 保持一致 */
const REGION_START = /^[ \t]*\/\/[ \t]*#region[ \t]+main\b/;

/** 骨架代码远长于此，用来在每次按键时以 O(1) 成本提前返回 */
const MIN_SNIPPET_LENGTH = 40;

/** 折叠命令的重试节奏（毫秒）：编辑器需要时间重新计算折叠模型 */
const FOLD_ATTEMPT_DELAYS = [120, 400, 900];

/** 在插入的文本里定位 `// #region main` 的绝对行号，找不到返回 -1 */
function findRegionLine(change: vscode.TextDocumentContentChangeEvent): number {
    const lines = change.text.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (REGION_START.test(lines[i])) {
            return change.range.start.line + i;
        }
    }
    return -1;
}

/** 折叠后 targetLine 之后的内容会被移出可见区域，以此判断是否已经折叠成功 */
function isFolded(editor: vscode.TextEditor, line: number): boolean {
    return editor.visibleRanges.some(
        (range) =>
            range.end.line === line &&
            line < editor.document.lineCount - 1,
    );
}

/** 目标行仍然是骨架的起始标记时才允许折叠，避免用户后续编辑导致误折叠 */
function isStillRegionStart(doc: vscode.TextDocument, line: number): boolean {
    return line < doc.lineCount && REGION_START.test(doc.lineAt(line).text);
}

/**
 * 折叠 targetLine 处的 region。
 *
 * 关键点：通过 `selectionLines` 参数指定折叠目标，全程不修改 editor.selection。
 * 直接移动光标会终止正在进行的 snippet 会话，导致 tabstop / $0 全部失效。
 */
function scheduleFold(uriStr: string, line: number, attempt: number) {
    if (attempt >= FOLD_ATTEMPT_DELAYS.length) {
        return;
    }

    setTimeout(() => {
        const editor = vscode.window.activeTextEditor;

        // 折叠命令作用于当前聚焦的编辑器，文件不在前台时跳过本次尝试
        if (!editor || editor.document.uri.toString() !== uriStr) {
            scheduleFold(uriStr, line, attempt + 1);
            return;
        }

        if (!isStillRegionStart(editor.document, line)) {
            globalThis.logger.log(`[autoFold] 第 ${line} 行已不是骨架标记，放弃折叠`);
            return;
        }

        if (isFolded(editor, line)) {
            globalThis.logger.log(`[autoFold] 第 ${line} 行已折叠，结束重试`);
            return;
        }

        vscode.commands
            .executeCommand('editor.fold', { levels: 1, selectionLines: [line] })
            .then(undefined, (err) => {
                globalThis.logger.error(`[autoFold] 折叠命令失败: ${String(err)}`);
            });

        scheduleFold(uriStr, line, attempt + 1);
    }, FOLD_ATTEMPT_DELAYS[attempt]);
}

export function setupAutoFold(context: vscode.ExtensionContext) {
    // 每个文档只自动折叠一次，避免用户手动展开后又被折回去
    const handledDocs = new Set<string>();

    context.subscriptions.push(
        vscode.workspace.onDidCloseTextDocument((doc) => {
            handledDocs.delete(doc.uri.toString());
        }),
    );

    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument((event) => {
            const doc = event.document;
            if (doc.languageId !== 'go' || doc.uri.scheme !== 'file') {
                return;
            }

            const uriStr = doc.uri.toString();
            if (handledDocs.has(uriStr)) {
                return;
            }

            for (const change of event.contentChanges) {
                if (change.text.length < MIN_SNIPPET_LENGTH) {
                    continue;
                }

                const line = findRegionLine(change);
                if (line === -1) {
                    continue;
                }

                if (!getAutoFoldPref()) {
                    return;
                }

                handledDocs.add(uriStr);

                globalThis.logger.log(`[autoFold] 检测到骨架插入，目标行 ${line}`);
                scheduleFold(uriStr, line, 0);
                return;
            }
        }),
    );
}
