import { describe, expect, it } from 'vitest';
import { cleanName, fileStatusOf, isInAllowedDirectory, problemPathsOf, relativeDirFor, testFileOf } from './layout';

describe('cleanName', () => {
    it('去掉题号前缀并折叠非法字符', () => {
        expect(cleanName('A - Only Pluses')).toBe('Only_Pluses');
        expect(cleanName('B. Fireworks')).toBe('Fireworks');
        expect(cleanName('C1 - Left and Right Houses')).toBe('Left_and_Right_Houses');
        expect(cleanName('  Hello, World!  ')).toBe('Hello_World');
        expect(cleanName('中文 题目 (Easy)')).toBe('中文_题目_Easy');
    });
});

describe('relativeDirFor', () => {
    it('Codeforces contest 与 problemset 两种 URL 落到同一目录', () => {
        const expected = ['cf', '1800_2000', '1945', 'B_Fireworks'];
        expect(relativeDirFor('https://codeforces.com/contest/1945/problem/B', 'Fireworks')).toEqual(expected);
        expect(relativeDirFor('https://codeforces.com/problemset/problem/1945/B', 'Fireworks')).toEqual(expected);
    });

    it('Codeforces 无法解析时进 unknown', () => {
        expect(relativeDirFor('https://codeforces.com/gym/104000/problem/A', 'X')).toEqual(['cf', 'unknown', 'X']);
    });

    it('AtCoder 按比赛分目录，比赛名转小写', () => {
        expect(relativeDirFor('https://atcoder.jp/contests/ABC347/tasks/abc347_a', 'Divisible')).toEqual([
            'atcoder',
            'abc347',
            'Divisible',
        ]);
    });

    it('AcWing / Luogu 带题号前缀，其他平台只用题名', () => {
        expect(relativeDirFor('https://www.acwing.com/problem/content/1/', 'A_B')).toEqual(['acwing', '1_A_B']);
        expect(relativeDirFor('https://www.luogu.com.cn/problem/P1001', 'A_B')).toEqual(['luogu', 'P1001_A_B']);
        expect(relativeDirFor('https://ac.nowcoder.com/acm/contest/1/A', 'Sum')).toEqual(['nowcoder', 'Sum']);
        expect(relativeDirFor('https://example.com/p/1', 'Sum')).toEqual(['others', 'Sum']);
    });
});

describe('文件状态与配对', () => {
    it('只认题目目录下的 Go 文件', () => {
        expect(isInAllowedDirectory('/repo/cf/1800_2000/1945/B/main.go')).toBe(true);
        expect(isInAllowedDirectory('/repo/void/2026_01_01/main.go')).toBe(true);
        expect(isInAllowedDirectory('/repo/leetcode/1/main.go')).toBe(false);
        expect(isInAllowedDirectory('/repo/cf.go')).toBe(false);
    });

    it('fileStatusOf 区分四种状态', () => {
        expect(fileStatusOf(undefined)).toBe('no-file');
        expect(fileStatusOf('/repo/cf/1/A/main.go')).toBe('valid');
        expect(fileStatusOf('/repo/cf/1/A/main_test.go')).toBe('is-test-file');
        expect(fileStatusOf('/repo/cf/1/A/notes.md')).toBe('not-allowed');
        expect(fileStatusOf('/repo/tool/io/io.go')).toBe('not-allowed');
    });

    it('problemPathsOf 从任一文件推出配对路径', () => {
        expect(testFileOf('/repo/cf/1/A/main.go')).toBe('/repo/cf/1/A/main_test.go');
        expect(problemPathsOf('/repo/cf/1/A/main_test.go')).toEqual({
            srcPath: '/repo/cf/1/A/main.go',
            testPath: '/repo/cf/1/A/main_test.go',
        });
        expect(problemPathsOf('/repo/cf/1/A/main.go').testPath).toBe('/repo/cf/1/A/main_test.go');
    });
});
