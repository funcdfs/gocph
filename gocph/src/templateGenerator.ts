/**
 * Template Generator 模块
 * 生成 main.go 和 main_test.go 的文件内容
 */

import { formatLocalTime } from './utils';

// ================================ Types ================================

export interface TestCase {
    input: string;
    output: string;
}

export interface ProblemData {
    name: string;
    group: string;
    url: string;
    tests: TestCase[];
}

// ================================ Main.go Generation ================================

/**
 * 生成 main.go 文件内容
 */
export function generateMainGo(url: string): string {
    const timeStr = formatLocalTime();
    return `// link: ${url}
// time: ${timeStr} https://github.com/funcdfs


`;
}

// ================================ Main_test.go Generation ================================

/**
 * 格式化单个测试用例
 */
function formatTestCase(test: TestCase, index: number): string {
    const input = test.input.endsWith('\n') ? test.input : test.input + '\n';
    const output = test.output.endsWith('\n') ? test.output : test.output + '\n';

    return `
		// case ${index + 1}
		C(\`
${input}\`, \`
${output}\`),`;
}

/**
 * 生成 main_test.go 文件内容
 */
export function generateTestGo(data: ProblemData): string {
    const timeStr = formatLocalTime();
    const testCases = data.tests.map((test, index) => formatTestCase(test, index)).join('');

    return `package main

import (
	"testing"

	. "github.com/funcdfs/algo/tool/testutil"
)

// Contest: ${data.group} ${data.name}
// URL: ${data.url}
// Time: ${timeStr}

func TestSolution(t *testing.T) {
	Run(t, []Case{
${testCases}
	}, main)
}
`;
}
