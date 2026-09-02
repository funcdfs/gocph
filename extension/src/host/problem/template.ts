/**
 * main.go 与 main_test.go 的唯一模板来源。
 * Companion 接题、void 空白题、Alt+1 补建用例文件、面板保存用例，都经过这里。
 */
import type { TestCase } from '../../shared/problem';
import { formatLocalTime } from './time';

export const TESTUTIL_IMPORT = 'github.com/funcdfs/gocph/tool/testutil';

export type CaseSeed = Pick<TestCase, 'input' | 'output'>;

export interface ProblemSeed {
    name: string;
    group: string;
    url: string;
    tests: CaseSeed[];
}

/** 头部两行注释；url 为空时只写时间行 */
export function renderMainGo(url: string | undefined, now: Date = new Date()): string {
    const link = url ? `// link: ${url}\n` : '';
    return `${link}// time: ${formatLocalTime(now)} https://github.com/funcdfs\n\n\n`;
}

const withTrailingNewline = (s: string): string => (s.endsWith('\n') ? s : `${s}\n`);

/** Run(t, []Case{ 与 }, main) 之间的用例列表，缩进与 gofmt 一致 */
export function renderCases(tests: readonly CaseSeed[]): string {
    return tests
        .map(
            (t, i) =>
                `\t\t// case ${i + 1}\n` +
                `\t\tC(\`\n${withTrailingNewline(t.input)}\`, \`\n${withTrailingNewline(t.output)}\`),\n`,
        )
        .join('');
}

/** 文件末尾的白板块注释；内容为空时保留一个空块，方便之后直接写 */
export function renderWhiteboard(text: string): string {
    const body = text.trim();
    return body ? `/*\n\n${body}\n\n*/\n` : '/*\n\n*/\n';
}

/** 头部注释格式为 "Contest: {group} - {name}"，解析时按最后一个 " - " 拆分 */
export function renderTestGo(seed: ProblemSeed, now: Date = new Date()): string {
    return `package main

import (
\t"testing"

\t. "${TESTUTIL_IMPORT}"
)

// Contest: ${seed.group} - ${seed.name}
// URL: ${seed.url}
// Time: ${formatLocalTime(now)}

func TestSolution(t *testing.T) {
\tRun(t, []Case{
${renderCases(seed.tests)}\t}, main)
}

${renderWhiteboard('')}`;
}
