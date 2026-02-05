import { describe, it, expect } from 'vitest';
import { parseTestFile, updateTestFileContent, isInAllowedDirectory, getTestFilePath } from '../testFileParser';

describe('testFileParser', () => {
    describe('parseTestFile', () => {
        it('应该正确解析标准 test 文件', () => {
            const content = `package main

import (
	"testing"

	. "github.com/funcdfs/gocph/tool/testutil"
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
        
        it('应该正确更新白板内容', () => {
            const original = `package main

func TestSolution(t *testing.T) {
	Run(t, []Case{
		C(\`input\`, \`output\`),
	}, main)
}

/*

old whiteboard content

*/
`;
            const tests = [{ input: 'input\n', output: 'output\n', id: 1 }];
            const whiteboard = 'new whiteboard content';

            const result = updateTestFileContent(original, tests, whiteboard);

            expect(result).toContain('new whiteboard content');
            expect(result).not.toContain('old whiteboard content');
            expect(result).toMatch(/\/\*\s*\n\nnew whiteboard content\n\n\*\/\n$/);
        });
        
        it('应该添加空白板注释块', () => {
            const original = `package main

func TestSolution(t *testing.T) {
	Run(t, []Case{
		C(\`input\`, \`output\`),
	}, main)
}
`;
            const tests = [{ input: 'input\n', output: 'output\n', id: 1 }];
            const whiteboard = '';

            const result = updateTestFileContent(original, tests, whiteboard);

            expect(result).toMatch(/\/\*\s*\n\n\*\/\n$/);
        });
    });
    
    describe('parseTestFile with whiteboard', () => {
        it('应该正确解析白板内容', () => {
            const content = `package main

// Contest: Test Contest
// URL: https://example.com

func TestSolution(t *testing.T) {
	Run(t, []Case{
		C(\`input\`, \`output\`),
	}, main)
}

/*

这是白板内容
可以有多行

*/
`;
            const problem = parseTestFile(content, '/test/main.go');

            expect(problem!.whiteboard).toBe('这是白板内容\n可以有多行');
        });
        
        it('应该处理空白板', () => {
            const content = `package main

// Contest: Test Contest
// URL: https://example.com

func TestSolution(t *testing.T) {
	Run(t, []Case{
		C(\`input\`, \`output\`),
	}, main)
}
`;
            const problem = parseTestFile(content, '/test/main.go');

            expect(problem!.whiteboard).toBe('');
        });
    });
});

describe('isInAllowedDirectory', () => {
    it('应该识别允许的目录 - cf', () => {
        expect(isInAllowedDirectory('/workspace/cf/1800_2000/1992/A/main.go')).toBe(true);
        expect(isInAllowedDirectory('C:\\workspace\\cf\\1800_2000\\main.go')).toBe(true);
    });

    it('应该识别允许的目录 - atcoder', () => {
        expect(isInAllowedDirectory('/workspace/atcoder/abc347/main.go')).toBe(true);
    });

    it('应该识别允许的目录 - void', () => {
        expect(isInAllowedDirectory('/workspace/void/test/main.go')).toBe(true);
    });

    it('应该拒绝不允许的目录', () => {
        expect(isInAllowedDirectory('/workspace/random/main.go')).toBe(false);
        expect(isInAllowedDirectory('/workspace/src/main.go')).toBe(false);
    });

    it('应该处理根目录文件', () => {
        expect(isInAllowedDirectory('/workspace/main.go')).toBe(false);
    });
});

describe('getTestFilePath', () => {
    it('应该生成正确的测试文件路径', () => {
        expect(getTestFilePath('/path/to/main.go')).toBe('/path/to/main_test.go');
        expect(getTestFilePath('/path/to/solution.go')).toBe('/path/to/solution_test.go');
    });

    it('应该处理 Windows 路径', () => {
        const result = getTestFilePath('C:\\path\\to\\main.go');
        expect(result).toContain('main_test.go');
    });

    it('应该处理没有扩展名的文件', () => {
        expect(getTestFilePath('/path/to/main')).toBe('/path/to/main_test');
    });
});
