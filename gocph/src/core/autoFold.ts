import * as vscode from 'vscode';

export function setupAutoFold(context: vscode.ExtensionContext) {
    const openTimes = new Map<string, number>();
    const foldedDocs = new Set<string>();

    // 记录已经打开的文件，防止扩展重载时无法触发生效
    const now = Date.now();
    vscode.workspace.textDocuments.forEach(doc => {
        if (doc.uri.scheme === 'file') {
            openTimes.set(doc.uri.toString(), now);
        }
    });

    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument((doc) => {
            if (doc.uri.scheme === 'file') {
                openTimes.set(doc.uri.toString(), Date.now());
            }
        })
    );

    context.subscriptions.push(
        vscode.workspace.onDidCloseTextDocument((doc) => {
            const uriStr = doc.uri.toString();
            openTimes.delete(uriStr);
            foldedDocs.delete(uriStr);
        })
    );

    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument((event) => {
            const doc = event.document;
            if (doc.uri.scheme !== 'file') {
                return;
            }

            const uriStr = doc.uri.toString();
            
            // 性能保证：O(1) 拦截，如果已经折叠过
            if (foldedDocs.has(uriStr)) {
                return;
            }

            const openTime = openTimes.get(uriStr);
            if (!openTime) {
                return;
            }

            const elapsed = Date.now() - openTime;
            // 性能保证：O(1) 拦截，如果距离文件打开时间超过 10 秒
            if (elapsed > 10000) {
                openTimes.delete(uriStr); // 超过 10 秒后不再需要监控此文件，清理内存
                return;
            }

            const logger = (globalThis as any).logger;
            logger?.log(`[autoFold] change event | elapsed: ${elapsed}ms | doc: ${uriStr}`);
            event.contentChanges.forEach((c, idx) => {
                logger?.log(`[autoFold] change[${idx}] line: ${c.range.start.line}, txtLength: ${c.text.length}, hasRegion: ${c.text.includes('region main')}`);
            });

            // 检查：变更是否发生在文件头部（前 10 行），并且新输入的文本中包含了 'region main'
            const isSnippetInsertion = event.contentChanges.some(
                c => c.range.start.line < 10 && c.text.includes('region main')
            );

            if (isSnippetInsertion) {
                logger?.log(`[autoFold] matched snippet insertion!`);
                let targetLine = -1;
                // 由于前面的条件极其严格，只有确实输入了骨架时才会走到这里，此时执行 O(N) 遍历行号开销完全可接受
                for (let i = 0; i < doc.lineCount; i++) {
                    if (doc.lineAt(i).text.includes('region main')) {
                        targetLine = i;
                        break;
                    }
                }

                logger?.log(`[autoFold] found target line for region: ${targetLine}`);

                if (targetLine !== -1) {
                    foldedDocs.add(uriStr);
                    openTimes.delete(uriStr);

                    // 延迟 500ms 后触发，让代码生成或 snippet 完全展开，避免冲突
                    setTimeout(() => {
                        const activeEditor = vscode.window.activeTextEditor;
                        const isMatch = activeEditor?.document.uri.toString() === uriStr;
                        logger?.log(`[autoFold] timeout executing. Editor match: ${isMatch}`);
                        if (activeEditor && isMatch) {
                            // 兼容性最佳实现：记录原光标，移动到目标行折叠，然后恢复原光标
                            const originalSelection = activeEditor.selection;
                            logger?.log(`[autoFold] saving original selection: line ${originalSelection.active.line}`);
                            
                            activeEditor.selection = new vscode.Selection(targetLine, 0, targetLine, 0);
                            
                            vscode.commands.executeCommand('editor.fold', {
                                direction: 'up',
                                levels: 1
                            }).then(() => {
                                // 恢复原光标
                                activeEditor.selection = originalSelection;
                                // 将编辑器滚动视图还原，防止因为折叠导致的画面跳动
                                activeEditor.revealRange(originalSelection, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
                                logger?.log(`[autoFold] command execute resolved. Cursor restored.`);
                            }, (err) => {
                                logger?.log(`[autoFold] command execute error: ${String(err)}`);
                                activeEditor.selection = originalSelection;
                            });
                        }
                    }, 500);
                }
            }
        })
    );
}
