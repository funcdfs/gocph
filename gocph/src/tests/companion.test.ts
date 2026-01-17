import { describe, it, expect } from 'vitest';

// 测试辅助函数 - 从 companion.ts 中提取的纯函数逻辑

/**
 * 获取比赛 ID 区间文件夹名
 */
function getContestRangeFolder(contestId: number): string {
    const base = Math.floor(contestId / 100) * 100;
    if (base === 0) {
        return '1-99';
    }
    return `${base}-${base + 99}`;
}

/**
 * 从 Codeforces URL 提取比赛 ID 和题目字母
 */
function parseCfUrl(url: string): { contestId: number; problem: string } | null {
    const contestMatch = url.match(/\/contest\/(\d+)\/problem\/([A-Za-z]\d?)/i);
    if (contestMatch) {
        return { contestId: parseInt(contestMatch[1]), problem: contestMatch[2].toUpperCase() };
    }
    const problemsetMatch = url.match(/\/problemset\/problem\/(\d+)\/([A-Za-z]\d?)/i);
    if (problemsetMatch) {
        return { contestId: parseInt(problemsetMatch[1]), problem: problemsetMatch[2].toUpperCase() };
    }
    return null;
}

/**
 * 从 AtCoder URL 提取比赛名和题目
 */
function parseAtcoderUrl(url: string): { contest: string; problem: string } | null {
    const match = url.match(/\/contests\/([^/]+)\/tasks\/[^_]+_([a-z]\d?)/i);
    if (match) {
        return { contest: match[1].toLowerCase(), problem: match[2].toUpperCase() };
    }
    return null;
}

/**
 * 转义 Go 字符串
 */
function escapeGoString(s: string): string {
    if (s.includes('`')) {
        return JSON.stringify(s);
    }
    return '`' + s + '`';
}

describe('Companion 模块测试', () => {
    describe('getContestRangeFolder', () => {
        it('应该正确处理 1-99 范围', () => {
            expect(getContestRangeFolder(1)).toBe('1-99');
            expect(getContestRangeFolder(50)).toBe('1-99');
            expect(getContestRangeFolder(99)).toBe('1-99');
        });

        it('应该正确处理 100-199 范围', () => {
            expect(getContestRangeFolder(100)).toBe('100-199');
            expect(getContestRangeFolder(101)).toBe('100-199');
            expect(getContestRangeFolder(199)).toBe('100-199');
        });

        it('应该正确处理 1900-1999 范围', () => {
            expect(getContestRangeFolder(1900)).toBe('1900-1999');
            expect(getContestRangeFolder(1992)).toBe('1900-1999');
            expect(getContestRangeFolder(1999)).toBe('1900-1999');
        });

        it('应该正确处理 2000+ 范围', () => {
            expect(getContestRangeFolder(2000)).toBe('2000-2099');
            expect(getContestRangeFolder(2050)).toBe('2000-2099');
        });
    });

    describe('parseCfUrl', () => {
        it('应该解析 contest URL', () => {
            const result = parseCfUrl('https://codeforces.com/contest/1992/problem/A');
            expect(result).toEqual({ contestId: 1992, problem: 'A' });
        });

        it('应该解析带数字的题目', () => {
            const result = parseCfUrl('https://codeforces.com/contest/1992/problem/A1');
            expect(result).toEqual({ contestId: 1992, problem: 'A1' });
        });

        it('应该解析 problemset URL', () => {
            const result = parseCfUrl('https://codeforces.com/problemset/problem/954/G');
            expect(result).toEqual({ contestId: 954, problem: 'G' });
        });

        it('应该处理小写题目字母', () => {
            const result = parseCfUrl('https://codeforces.com/contest/1/problem/a');
            expect(result).toEqual({ contestId: 1, problem: 'A' });
        });

        it('应该返回 null 对于无效 URL', () => {
            expect(parseCfUrl('https://codeforces.com/')).toBeNull();
            expect(parseCfUrl('https://google.com')).toBeNull();
        });
    });

    describe('parseAtcoderUrl', () => {
        it('应该解析 AtCoder URL', () => {
            const result = parseAtcoderUrl('https://atcoder.jp/contests/abc347/tasks/abc347_a');
            expect(result).toEqual({ contest: 'abc347', problem: 'A' });
        });

        it('应该解析 ARC URL', () => {
            const result = parseAtcoderUrl('https://atcoder.jp/contests/arc150/tasks/arc150_b');
            expect(result).toEqual({ contest: 'arc150', problem: 'B' });
        });

        it('应该处理大写比赛名', () => {
            const result = parseAtcoderUrl('https://atcoder.jp/contests/ABC347/tasks/ABC347_c');
            expect(result).toEqual({ contest: 'abc347', problem: 'C' });
        });

        it('应该返回 null 对于无效 URL', () => {
            expect(parseAtcoderUrl('https://atcoder.jp/')).toBeNull();
            expect(parseAtcoderUrl('https://codeforces.com/contest/1/problem/A')).toBeNull();
        });
    });

    describe('escapeGoString', () => {
        it('应该使用反引号包裹普通字符串', () => {
            expect(escapeGoString('hello')).toBe('`hello`');
            expect(escapeGoString('1 2 3')).toBe('`1 2 3`');
        });

        it('应该处理包含换行的字符串', () => {
            expect(escapeGoString('line1\nline2')).toBe('`line1\nline2`');
        });

        it('应该使用双引号处理包含反引号的字符串', () => {
            const result = escapeGoString('hello`world');
            expect(result).toBe('"hello`world"');
        });

        it('应该正确转义特殊字符', () => {
            const result = escapeGoString('hello`"world');
            expect(result).toBe('"hello`\\"world"');
        });
    });
});

describe('文件路径生成测试', () => {
    it('Codeforces 路径格式应该正确', () => {
        // 模拟路径生成逻辑
        const contestId = 1992;
        const problem = 'A';
        const rangeFolder = getContestRangeFolder(contestId);
        const fileName = `${contestId}_${problem}`;
        
        expect(rangeFolder).toBe('1900-1999');
        expect(fileName).toBe('1992_A');
        // 完整路径: codeforces/1900-1999/1992_A.go
    });

    it('AtCoder 路径格式应该正确', () => {
        const parsed = parseAtcoderUrl('https://atcoder.jp/contests/abc347/tasks/abc347_a');
        expect(parsed).not.toBeNull();
        if (parsed) {
            expect(parsed.contest).toBe('abc347');
            expect(parsed.problem).toBe('A');
            // 完整路径: atcoder/abc347/A.go
        }
    });
});

describe('函数名生成测试', () => {
    it('Codeforces 函数名格式应该正确', () => {
        const contestId = 1992;
        const problem = 'A';
        const funcName = `CF${contestId}${problem}`;
        expect(funcName).toBe('CF1992A');
    });

    it('AtCoder 函数名格式应该正确', () => {
        const contest = 'abc347';
        const problem = 'A';
        const funcName = `${contest}${problem}`;
        expect(funcName).toBe('abc347A');
    });
});
