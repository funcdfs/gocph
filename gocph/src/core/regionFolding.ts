import * as vscode from 'vscode';
import { matchRegionPairs } from './regionMatcher';

/**
 * 为 Go 文件注册 `// #region` / `// #endregion` 的折叠区域。
 *
 * 背景：VS Code 的默认折叠策略（editor.foldingStrategy = "auto"）一旦发现有
 * FoldingRangeProvider（gopls 必定注册一个），就会完全忽略语言配置里的
 * folding.markers —— 那些标记只在纯缩进策略下生效。而 gopls 不识别
 * `#region` 注释，导致骨架区域连折叠箭头都不出现，autoFold 也随之失效。
 *
 * VS Code 会合并多个 provider 的折叠结果，所以这里补一个只认 region
 * 标记的 provider，与 gopls 的语法折叠共存。
 */
export function setupRegionFolding(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.languages.registerFoldingRangeProvider(
            { language: 'go' },
            {
                provideFoldingRanges(document) {
                    const lines: string[] = [];
                    for (let i = 0; i < document.lineCount; i++) {
                        lines.push(document.lineAt(i).text);
                    }
                    return matchRegionPairs(lines).map(
                        (pair) =>
                            new vscode.FoldingRange(
                                pair.start,
                                pair.end,
                                vscode.FoldingRangeKind.Region,
                            ),
                    );
                },
            },
        ),
    );
}
