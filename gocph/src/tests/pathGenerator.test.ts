/**
 * 路径生成器测试
 */
import { describe, test, expect } from 'vitest';
import { getPlatform, cleanName, generatePaths } from '../pathGenerator';

describe('getPlatform - 平台检测', () => {
    test('识别 Codeforces', () => {
        expect(getPlatform('https://codeforces.com/contest/1992/problem/A')).toBe('codeforces');
        expect(getPlatform('https://codeforces.com/problemset/problem/954/G')).toBe('codeforces');
    });

    test('识别 AtCoder', () => {
        expect(getPlatform('https://atcoder.jp/contests/abc347/tasks/abc347_a')).toBe('atcoder');
        expect(getPlatform('https://atcoder.jp/contests/arc150/tasks/arc150_b')).toBe('atcoder');
    });

    test('识别 AcWing', () => {
        expect(getPlatform('https://www.acwing.com/problem/content/1/')).toBe('acwing');
    });

    test('识别 Luogu', () => {
        expect(getPlatform('https://www.luogu.com.cn/problem/P1001')).toBe('luogu');
    });

    test('识别 NowCoder', () => {
        expect(getPlatform('https://www.nowcoder.com/practice/abc')).toBe('nowcoder');
    });

    test('未知平台返回 other', () => {
        expect(getPlatform('https://example.com/problem/1')).toBe('other');
        expect(getPlatform('https://google.com')).toBe('other');
    });
});

describe('cleanName - 名称清理', () => {
    test('移除题号前缀 - 单字母', () => {
        expect(cleanName('A - Problem Name')).toBe('Problem_Name');
        expect(cleanName('B. Problem Name')).toBe('Problem_Name');
        expect(cleanName('C: Problem Name')).toBe('Problem_Name');
    });

    test('移除题号前缀 - 字母加数字', () => {
        expect(cleanName('A1 - Problem Name')).toBe('Problem_Name');
        expect(cleanName('C2. Problem Name')).toBe('Problem_Name');
    });

    test('保留中文字符', () => {
        expect(cleanName('A - 测试题目')).toBe('测试题目');
        expect(cleanName('题目名称')).toBe('题目名称');
    });

    test('替换特殊字符为下划线', () => {
        expect(cleanName('Problem (Easy)')).toBe('Problem_Easy');
        expect(cleanName('Problem & Solution')).toBe('Problem_Solution');
        expect(cleanName('Problem-Name')).toBe('Problem_Name');
    });

    test('合并连续下划线', () => {
        expect(cleanName('Problem   Name')).toBe('Problem_Name');
        expect(cleanName('A - Problem - - Name')).toBe('Problem_Name');
    });

    test('去除首尾下划线', () => {
        expect(cleanName('_Problem_')).toBe('Problem');
        expect(cleanName('A - _Problem_')).toBe('Problem');
    });

    test('保留字母和数字', () => {
        expect(cleanName('Problem123')).toBe('Problem123');
        expect(cleanName('ABC123XYZ')).toBe('ABC123XYZ');
    });

    test('空字符串', () => {
        expect(cleanName('')).toBe('');
    });
});

describe('generatePaths - 路径生成', () => {
    const workspaceRoot = '/workspace';

    describe('Codeforces 路径', () => {
        test('标准 contest URL', () => {
            const result = generatePaths(
                workspaceRoot,
                'https://codeforces.com/contest/1992/problem/A',
                'A - Strange Table'
            );
            expect(result).not.toBeNull();
            expect(result!.dirPath).toContain('cf');
            expect(result!.dirPath).toContain('1800_2000');
            expect(result!.dirPath).toContain('1992');
            expect(result!.dirPath).toContain('A_Strange_Table');
            expect(result!.srcPath).toContain('main.go');
            expect(result!.testPath).toContain('main_test.go');
        });

        test('区间计算 - 0-199', () => {
            const result = generatePaths(
                workspaceRoot,
                'https://codeforces.com/contest/50/problem/A',
                'A - Problem'
            );
            expect(result!.dirPath).toContain('0_200');
        });

        test('区间计算 - 1400-1599', () => {
            const result = generatePaths(
                workspaceRoot,
                'https://codeforces.com/contest/1506/problem/A',
                'A - Problem'
            );
            expect(result!.dirPath).toContain('1400_1600');
        });

        test('problemset URL', () => {
            const result = generatePaths(
                workspaceRoot,
                'https://codeforces.com/problemset/problem/954/G',
                'G - Problem'
            );
            expect(result).not.toBeNull();
            expect(result!.dirPath).toContain('cf');
            expect(result!.dirPath).toContain('954');
        });
    });

    describe('AtCoder 路径', () => {
        test('ABC contest', () => {
            const result = generatePaths(
                workspaceRoot,
                'https://atcoder.jp/contests/abc347/tasks/abc347_a',
                'A - Problem Name'
            );
            expect(result).not.toBeNull();
            expect(result!.dirPath).toContain('atcoder');
            expect(result!.dirPath).toContain('abc347');
            expect(result!.dirPath).toContain('Problem_Name');
        });

        test('ARC contest', () => {
            const result = generatePaths(
                workspaceRoot,
                'https://atcoder.jp/contests/arc150/tasks/arc150_b',
                'B - Problem'
            );
            expect(result!.dirPath).toContain('arc150');
        });
    });

    describe('AcWing 路径', () => {
        test('标准 URL', () => {
            const result = generatePaths(
                workspaceRoot,
                'https://www.acwing.com/problem/content/1/',
                'Problem Name'
            );
            expect(result).not.toBeNull();
            expect(result!.dirPath).toContain('acwing');
            expect(result!.dirPath).toContain('1_Problem_Name');
        });
    });

    describe('Luogu 路径', () => {
        test('标准 URL', () => {
            const result = generatePaths(
                workspaceRoot,
                'https://www.luogu.com.cn/problem/P1001',
                'A+B Problem'
            );
            expect(result).not.toBeNull();
            expect(result!.dirPath).toContain('luogu');
            expect(result!.dirPath).toContain('P1001_A_B_Problem');
        });
    });

    describe('NowCoder 路径', () => {
        test('标准 URL', () => {
            const result = generatePaths(
                workspaceRoot,
                'https://www.nowcoder.com/practice/abc',
                'Problem Name'
            );
            expect(result).not.toBeNull();
            expect(result!.dirPath).toContain('nowcoder');
            expect(result!.dirPath).toContain('Problem_Name');
        });
    });

    describe('其他平台路径', () => {
        test('未知平台', () => {
            const result = generatePaths(
                workspaceRoot,
                'https://example.com/problem/1',
                'Problem Name'
            );
            expect(result).not.toBeNull();
            expect(result!.dirPath).toContain('others');
            expect(result!.dirPath).toContain('Problem_Name');
        });
    });
});
