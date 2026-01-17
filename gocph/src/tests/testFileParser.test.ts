import { describe, it, expect } from 'vitest';
import { parseTestFile, updateTestFileContent } from '../testFileParser';

describe('testFileParser', () => {
    describe('parseTestFile', () => {
        it('应该正确解析标准 test 文件', () => {
            const content = `package main

import (
	"testing"

	. "github.com/funcdfs/algo/tool/testutil"
)

// Contest: Codeforces - Educational Codeforces Round 167 (Rated for Div. 2) A. Catch the Coin
// URL: https://codeforces.com/contest/1989/problem/A
// Time: 2026-01-17 01:01:08

func TestSolution(t *testing.T) {
	Run(t, []Case{

		// case 1
		C(\`
5
24 42
-2 -1
-1 -2
0 -50
15 0
\`, \`
YES
YES
NO
NO
YES
\`),
	}, main)
}
`;
            const srcPath = '/test/main.go';
            const problem = parseTestFile(content, srcPath);

            expect(problem).not.toBeNull();
            expect(problem!.url).toBe('https://codeforces.com/contest/1989/problem/A');
            expect(problem!.group).toBe('Codeforces - Educational Codeforces Round 167 (Rated for Div. 2) A. Catch the Coin');
            expect(problem!.srcPath).toBe(srcPath);
            expect(problem!.tests).toHaveLength(1);
            expect(problem!.tests[0].input).toBe('5\n24 42\n-2 -1\n-1 -2\n0 -50\n15 0\n');
            expect(problem!.tests[0].output).toBe('YES\nYES\nNO\nNO\nYES\n');
        });

        it('应该正确解析多个测试用例', () => {
            const content = `package main

// Contest: Test Contest
// URL: https://example.com

func TestSolution(t *testing.T) {
	Run(t, []Case{
		// case 1
		C(\`
1
\`, \`
2
\`),
		// case 2
		C(\`
3
\`, \`
4
\`),
	}, main)
}
`;
            const problem = parseTestFile(content, '/test/main.go');

            expect(problem!.tests).toHaveLength(2);
            expect(problem!.tests[0].input).toBe('1\n');
            expect(problem!.tests[0].output).toBe('2\n');
            expect(problem!.tests[1].input).toBe('3\n');
            expect(problem!.tests[1].output).toBe('4\n');
        });

        it('应该处理空测试用例', () => {
            const content = `package main

// Contest: Test
// URL: https://example.com

func TestSolution(t *testing.T) {
	Run(t, []Case{
		C(\`\`, \`\`),
	}, main)
}
`;
            const problem = parseTestFile(content, '/test/main.go');

            expect(problem!.tests).toHaveLength(1);
            expect(problem!.tests[0].input).toBe('\n');
            expect(problem!.tests[0].output).toBe('\n');
        });
    });

    describe('updateTestFileContent', () => {
        it('应该正确更新测试用例', () => {
            const original = `package main

func TestSolution(t *testing.T) {
	Run(t, []Case{
		// case 1
		C(\`old\`, \`old\`),
	}, main)
}
`;
            const newTests = [
                { input: 'new1\n', output: 'out1\n', id: 1 },
                { input: 'new2\n', output: 'out2\n', id: 2 },
            ];

            const result = updateTestFileContent(original, newTests);

            expect(result).toContain('new1');
            expect(result).toContain('new2');
            expect(result).toContain('out1');
            expect(result).toContain('out2');
            expect(result).not.toContain('old');
            expect(result).toContain('}, main)');
        });
    });
});
