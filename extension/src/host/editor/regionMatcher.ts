/**
 * 纯函数版 region 配对逻辑，供 folding.ts 和单元测试使用。
 * 不允许 import 'vscode'，保证可以在 vitest 中直接运行。
 */

/** 与 language-configuration.json 中声明的折叠标记保持一致 */
const REGION_START = /^[ \t]*\/\/[ \t]*#?region\b/;
const REGION_END = /^[ \t]*\/\/[ \t]*#?endregion\b/;

export interface RegionPair {
    /** `// #region` 所在行（0-based） */
    start: number;
    /** `// #endregion` 所在行（0-based），折叠时连同此行一起隐藏 */
    end: number;
}

/**
 * 用栈配对 `// #region` / `// #endregion` 标记，支持嵌套。
 * 未闭合的 start 与多余的 end 都会被忽略，不产生折叠区域。
 */
export function matchRegionPairs(lines: readonly string[]): RegionPair[] {
    const stack: number[] = [];
    const pairs: RegionPair[] = [];

    for (let i = 0; i < lines.length; i++) {
        if (REGION_START.test(lines[i])) {
            stack.push(i);
        } else if (REGION_END.test(lines[i])) {
            const start = stack.pop();
            if (start !== undefined && i > start) {
                pairs.push({ start, end: i });
            }
        }
    }

    return pairs;
}
