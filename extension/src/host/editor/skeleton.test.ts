import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { matchRegionPairs } from './regionMatcher';
import { findSkeletonLine, MAX_REPLACED_LENGTH, SKELETON_START, skeletonInsertionLine } from './skeleton';

/** 直接读取真实的 snippets/go.json，保证测试的是用户实际会插入的文本 */
const snippets = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../snippets/go.json'), 'utf-8')) as Record<
    string,
    { body: string[] }
>;
const TEMPLATES = ['cp', 'tt', 'ttna'] as const;
const bodyOf = (name: string): string => snippets[name].body.join('\n');

describe('三套模板 snippet 与折叠标记的契约', () => {
    it.each(TEMPLATES)('%s 的第一行是 // #region main，且与 // #endregion main 配对', (name) => {
        const lines = snippets[name].body;
        expect(SKELETON_START.test(lines[0])).toBe(true);
        const pairs = matchRegionPairs(lines);
        expect(pairs.some((p) => p.start === 0)).toBe(true);
        const end = pairs.find((p) => p.start === 0)!.end;
        expect(lines[end]).toMatch(/^\/\/ #endregion main$/);
        // $0 落在骨架之外，折叠后光标仍然可见
        expect(lines.findIndex((l) => l.includes('$0'))).toBeGreaterThan(end);
    });

    it('其他 snippet 都不含 region 标记，不会误触发自动折叠', () => {
        for (const [name, { body }] of Object.entries(snippets)) {
            if (!(TEMPLATES as readonly string[]).includes(name)) {
                expect(findSkeletonLine(body.join('\n'), 0), name).toBe(-1);
            }
        }
    });
});

describe('skeletonInsertionLine', () => {
    it.each(TEMPLATES)('识别 %s 的 snippet 展开：前缀被替换成整段模板', (name) => {
        // 用户在第 2 行输入前缀后接受补全：range 覆盖前缀（2~4 个字符），text 是完整模板
        const change = { text: bodyOf(name), rangeLength: name.length, startLine: 2, endLine: 2 };
        expect(skeletonInsertionLine(change)).toBe(2);
    });

    it('通过命令面板插入（没有前缀）与在缩进后插入也能识别', () => {
        expect(skeletonInsertionLine({ text: bodyOf('cp'), rangeLength: 0, startLine: 5, endLine: 5 })).toBe(5);
        const indented = '\t' + bodyOf('cp').split('\n').join('\n\t');
        expect(skeletonInsertionLine({ text: indented, rangeLength: 2, startLine: 0, endLine: 0 })).toBe(0);
    });

    it('标记不在插入文本首行时返回它的实际行号', () => {
        const text = '\n\n' + bodyOf('cp');
        expect(skeletonInsertionLine({ text, rangeLength: 0, startLine: 3, endLine: 3 })).toBe(5);
    });

    it('整文件重载 / 格式化替换（替换范围很大或跨行）不触发', () => {
        const text = bodyOf('cp');
        expect(skeletonInsertionLine({ text, rangeLength: text.length, startLine: 0, endLine: 40 })).toBe(-1);
        expect(skeletonInsertionLine({ text, rangeLength: MAX_REPLACED_LENGTH + 1, startLine: 0, endLine: 0 })).toBe(-1);
        expect(skeletonInsertionLine({ text, rangeLength: 0, startLine: 0, endLine: 1 })).toBe(-1);
    });

    it('普通输入、删除、不含标记的粘贴不触发', () => {
        expect(skeletonInsertionLine({ text: 'x', rangeLength: 0, startLine: 0, endLine: 0 })).toBe(-1);
        expect(skeletonInsertionLine({ text: '', rangeLength: 200, startLine: 0, endLine: 10 })).toBe(-1);
        const plain = 'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("hi")\n}\n';
        expect(skeletonInsertionLine({ text: plain, rangeLength: 0, startLine: 0, endLine: 0 })).toBe(-1);
        // 只提到 region 的注释不算
        expect(findSkeletonLine('// regionalSettings main\n// this is not a #region main marker'.padEnd(60), 0)).toBe(-1);
    });
});
