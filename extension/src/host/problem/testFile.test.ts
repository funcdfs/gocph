import { describe, expect, it } from 'vitest';
import { renderMainGo, renderTestGo } from './template';
import { isGocphTestFile, parseTestFile, updateTestFile } from './testFile';

const NOW = new Date(2026, 0, 20, 22, 50, 47);
const seed = {
    name: 'B. Fireworks',
    group: 'Codeforces - Codeforces Round 935 (Div. 3)',
    url: 'https://codeforces.com/contest/1945/problem/B',
    tests: [
        { input: '2\n1 2\n', output: '3\n' },
        { input: '1 1', output: '2' },
    ],
};

describe('模板与解析互为逆操作', () => {
    const content = renderTestGo(seed, NOW);

    it('生成的文件能被识别，且缩进符合 gofmt', () => {
        expect(isGocphTestFile(content)).toBe(true);
        expect(content).toContain('// Contest: Codeforces - Codeforces Round 935 (Div. 3) - B. Fireworks');
        expect(content).toContain('// Time: 2026-01-20 22:50:47');
        expect(content).toContain('\tRun(t, []Case{\n\t\t// case 1\n\t\tC(`\n2\n1 2\n`, `\n3\n`),\n\t\t// case 2\n');
        expect(content.endsWith('\t}, main)\n}\n\n/*\n\n*/\n')).toBe(true);
    });

    it('解析出题名、URL、稳定的用例 id 与规范化后的用例', () => {
        const problem = parseTestFile(content, '/repo/main.go');
        expect(problem.name).toBe('B. Fireworks');
        expect(problem.group).toBe('Codeforces - Codeforces Round 935 (Div. 3)');
        expect(problem.url).toBe(seed.url);
        expect(problem.srcPath).toBe('/repo/main.go');
        expect(problem.tests).toEqual([
            { id: 1, input: '2\n1 2\n', output: '3\n' },
            { id: 2, input: '1 1\n', output: '2\n' },
        ]);
        expect(problem.whiteboard).toBe('');
    });

    it('兼容旧格式的 Contest 行（group 与 name 之间没有分隔符）', () => {
        const legacy = content.replace(/\/\/ Contest: .+/, '// Contest: Codeforces - Round 935 B. Fireworks');
        expect(parseTestFile(legacy, '/repo/main.go').name).toBe('Round 935 B. Fireworks');
    });

    it('main.go 头部：有 url 写两行，没有只写时间', () => {
        expect(renderMainGo('https://x', NOW)).toBe(
            '// link: https://x\n// time: 2026-01-20 22:50:47 https://github.com/funcdfs\n\n\n',
        );
        expect(renderMainGo(undefined, NOW)).toBe('// time: 2026-01-20 22:50:47 https://github.com/funcdfs\n\n\n');
    });
});

describe('updateTestFile', () => {
    const original = renderTestGo(seed, NOW);

    it('替换用例与白板，头部注释与其余代码保持不变', () => {
        const updated = updateTestFile(original, [{ input: '7', output: '8' }], '# 思路\n\n贪心');
        expect(updated).toContain('// Contest: Codeforces - Codeforces Round 935 (Div. 3) - B. Fireworks');
        expect(updated).toContain('\tRun(t, []Case{\n\t\t// case 1\n\t\tC(`\n7\n`, `\n8\n`),\n\t}, main)\n}');
        expect(updated).not.toContain('// case 2');
        expect(updated.endsWith('}\n\n/*\n\n# 思路\n\n贪心\n\n*/\n')).toBe(true);

        const reparsed = parseTestFile(updated, '/repo/main.go');
        expect(reparsed.tests).toEqual([{ id: 1, input: '7\n', output: '8\n' }]);
        expect(reparsed.whiteboard).toBe('# 思路\n\n贪心');
    });

    it('清空白板后只保留一个空块注释', () => {
        const withBoard = updateTestFile(original, seed.tests, 'x');
        const cleared = updateTestFile(withBoard, seed.tests, '');
        expect(cleared.endsWith('}\n\n/*\n\n*/\n')).toBe(true);
        expect(cleared.match(/\/\*/g)).toHaveLength(1);
    });

    it('文件中间的块注释不会被当成白板', () => {
        const withInnerComment = original.replace('func TestSolution', '/* helper */\nfunc TestSolution');
        expect(parseTestFile(withInnerComment, '/repo/main.go').whiteboard).toBe('');
        const updated = updateTestFile(withInnerComment, seed.tests, 'note');
        expect(updated).toContain('/* helper */\nfunc TestSolution');
        expect(updated.endsWith('/*\n\nnote\n\n*/\n')).toBe(true);
    });

    it('不是 gocph 格式时报错而不是写坏文件', () => {
        expect(() => updateTestFile('package main\n', [], '')).toThrow('无法找到测试用例区域');
    });
});
