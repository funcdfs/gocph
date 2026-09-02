/**
 * 识别「模板骨架被插入」的纯函数，供 autoFold.ts 和单元测试使用。不允许 import 'vscode'。
 */

/** 模板骨架的折叠起始标记，与 snippets/go.json 中 cp / tt / ttna 的第一行保持一致 */
export const SKELETON_START = /^[ \t]*\/\/[ \t]*#region[ \t]+main\b/;

/** 骨架远长于此；短于它的变更不用继续看 */
export const MIN_SKELETON_LENGTH = 40;

/**
 * snippet 展开时被替换掉的只有前缀（cp / tt / ttna），最多几个字符；
 * 打开文件、git 切分支重载、格式化整文件替换掉的范围远大于此。
 */
export const MAX_REPLACED_LENGTH = 16;

/** onDidChangeTextDocument 里一条 contentChange 的必要信息 */
export interface ContentChange {
    text: string;
    rangeLength: number;
    startLine: number;
    endLine: number;
}

/** 在插入文本里找 `// #region main`，返回它在文档中的绝对行号；找不到返回 -1 */
export function findSkeletonLine(text: string, startLine: number): number {
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (SKELETON_START.test(lines[i])) {
            return startLine + i;
        }
    }
    return -1;
}

/**
 * 这次变更是不是「插入了一份模板骨架」，是则返回骨架起始行，否则返回 -1。
 *
 * 只有 snippet 展开、粘贴模板这类「用一小段单行范围换成一大段含标记的文本」才算；
 * 打开文件、外部修改后重载、格式化整文件替换都不算 —— 否则用户手动展开的骨架会被再折回去。
 */
export function skeletonInsertionLine(change: ContentChange): number {
    if (change.text.length < MIN_SKELETON_LENGTH) {
        return -1;
    }
    if (change.startLine !== change.endLine || change.rangeLength > MAX_REPLACED_LENGTH) {
        return -1;
    }
    return findSkeletonLine(change.text, change.startLine);
}
