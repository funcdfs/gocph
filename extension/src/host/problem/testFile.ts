/**
 * main_test.go 是题目数据的唯一存储：
 * 元数据在头部注释，用例在 Run(t, []Case{ ... }, main) 里，白板在文件末尾的块注释。
 * 本模块只做字符串 ↔ Problem 的转换与读写，不依赖 vscode。
 */
import * as fs from 'fs';
import type { Problem, TestCase } from '../../shared/problem';
import { logger } from '../logger';
import { testFileOf } from './layout';
import { renderCases, renderWhiteboard, TESTUTIL_IMPORT, type CaseSeed } from './template';

const CASES_START = /Run\(t,\s*\[\]Case\{/;
const CASES_END = /\},\s*main\)/;
const CASE = /C\(\s*`([\s\S]*?)`\s*,\s*`([\s\S]*?)`\s*\)/g;

/** 是否是 gocph 生成的格式：必须用 testutil 且有 Run(t, []Case{ 结构 */
export function isGocphTestFile(content: string): boolean {
    return CASES_START.test(content) && content.includes(TESTUTIL_IMPORT);
}

export function parseTestFile(content: string, srcPath: string): Problem {
    const header = content.match(/\/\/ Contest: (.+)/)?.[1]?.trim() ?? '';
    const url = content.match(/\/\/ URL: (.+)/)?.[1]?.trim() ?? '';
    const sep = header.lastIndexOf(' - ');
    return {
        name: sep >= 0 ? header.slice(sep + 3).trim() : header,
        group: sep >= 0 ? header.slice(0, sep).trim() : header,
        url,
        srcPath,
        tests: parseCases(content),
        whiteboard: parseWhiteboard(content),
    };
}

/** 用例 id 就是序号（从 1 起），同一文件多次解析得到的 id 稳定 */
function parseCases(content: string): TestCase[] {
    const tests: TestCase[] = [];
    for (const match of content.matchAll(CASE)) {
        tests.push({
            id: tests.length + 1,
            input: normalize(match[1]),
            output: normalize(match[2]),
        });
    }
    return tests;
}

/** 去掉反引号后的首个换行，保证以换行结尾 */
function normalize(raw: string): string {
    const body = raw.replace(/^\n/, '');
    return body.endsWith('\n') ? body : `${body}\n`;
}

/** 文件末尾块注释 /* ... *\/ 的起止下标；末尾没有块注释时返回 undefined */
function trailingBlockComment(content: string): { start: number; end: number } | undefined {
    const end = content.lastIndexOf('*/');
    if (end < 0 || content.slice(end + 2).trim() !== '') {
        return undefined;
    }
    const start = content.lastIndexOf('/*', end);
    return start < 0 ? undefined : { start, end };
}

function parseWhiteboard(content: string): string {
    const block = trailingBlockComment(content);
    return block ? content.slice(block.start + 2, block.end).trim() : '';
}

/** 只替换用例列表与白板，头部注释与其余代码原样保留 */
export function updateTestFile(content: string, tests: readonly CaseSeed[], whiteboard: string): string {
    const start = content.match(CASES_START);
    if (!start || start.index === undefined) {
        throw new Error('无法找到测试用例区域');
    }
    const bodyStart = start.index + start[0].length;
    const endOffset = content.slice(bodyStart).search(CASES_END);
    if (endOffset < 0) {
        throw new Error('无法找到测试用例区域');
    }
    const withCases =
        content.slice(0, bodyStart) + '\n' + renderCases(tests) + '\t' + content.slice(bodyStart + endOffset);

    const block = trailingBlockComment(withCases);
    const head = (block ? withCases.slice(0, block.start) : withCases).trimEnd();
    return `${head}\n\n${renderWhiteboard(whiteboard)}`;
}

/** 读取 main.go 对应的题目；没有用例文件或不是 gocph 格式时返回 undefined */
export function readProblem(srcPath: string): Problem | undefined {
    const testPath = testFileOf(srcPath);
    if (!fs.existsSync(testPath)) {
        return undefined;
    }
    try {
        const content = fs.readFileSync(testPath, 'utf-8');
        return isGocphTestFile(content) ? parseTestFile(content, srcPath) : undefined;
    } catch (err) {
        logger.error('读取用例文件失败', testPath, err);
        return undefined;
    }
}

/** 把面板里的用例与白板写回 main_test.go */
export function writeProblem(problem: Problem): void {
    const testPath = testFileOf(problem.srcPath);
    const content = fs.readFileSync(testPath, 'utf-8');
    fs.writeFileSync(testPath, updateTestFile(content, problem.tests, problem.whiteboard));
}
