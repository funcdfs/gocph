/**
 * Test File Parser 模块
 * 直接从 main_test.go 解析和写入测试数据，不再需要 problem.json
 */

import fs from 'fs';
import path from 'path';
import { Problem, TestCase } from './types';

// ================================ Constants ================================

/**
 * 允许的目录白名单
 * 只有在这些目录下的文件才会触发 WebView 渲染
 */
const ALLOWED_DIRECTORIES = [
    'cf',
    'atcoder', 
    'acwing',
    'luogu',
    'nowcoder',
    'others',
];

// ================================ Path Helpers ================================

/**
 * 检查文件路径是否在允许的目录下
 */
export function isInAllowedDirectory(srcPath: string): boolean {
    const normalizedPath = srcPath.replace(/\\/g, '/');
    return ALLOWED_DIRECTORIES.some(dir => {
        // 匹配 /dir/ 或 \dir\ 形式
        const pattern = new RegExp(`[/\\\\]${dir}[/\\\\]`);
        return pattern.test(normalizedPath);
    });
}

/**
 * 获取 main.go 对应的 main_test.go 路径
 */
export function getTestFilePath(srcPath: string): string {
    const dir = path.dirname(srcPath);
    const ext = path.extname(srcPath);
    const base = path.basename(srcPath, ext);
    return path.join(dir, `${base}_test${ext}`);
}

// ================================ Parser ================================

/**
 * 从 test 文件内容解析 Problem 数据
 */
export function parseTestFile(content: string, srcPath: string): Problem | null {
    try {
        // 解析元数据注释
        const contestMatch = content.match(/\/\/ Contest: (.+)/);
        const urlMatch = content.match(/\/\/ URL: (.+)/);
        
        const group = contestMatch?.[1]?.trim() ?? '';
        const url = urlMatch?.[1]?.trim() ?? '';
        
        // 从 group 中提取 name (最后一个空格后的部分，通常是 "A. Problem Name")
        const nameParts = group.split(' - ');
        const name = nameParts.length > 1 ? nameParts[nameParts.length - 1].trim() : group;

        // 解析测试用例
        const tests = parseTestCases(content);

        return {
            name,
            url,
            interactive: false,
            memoryLimit: 256,
            timeLimit: 2000,
            group,
            tests,
            srcPath,
        };
    } catch (error) {
        globalThis.logger?.error('解析 test 文件失败', error);
        return null;
    }
}

/**
 * 解析所有测试用例
 */
function parseTestCases(content: string): TestCase[] {
    const tests: TestCase[] = [];
    
    // 匹配 C(`input`, `output`) 模式
    // 使用非贪婪匹配，处理反引号内的内容
    const caseRegex = /C\(\s*`([\s\S]*?)`\s*,\s*`([\s\S]*?)`\s*\)/g;
    
    let match;
    let id = 1;
    while ((match = caseRegex.exec(content)) !== null) {
        const input = normalizeTestContent(match[1]);
        const output = normalizeTestContent(match[2]);
        
        tests.push({
            input,
            output,
            id: Date.now() + id,
        });
        id++;
    }

    return tests;
}

/**
 * 规范化测试内容（去除首尾空行，保留换行）
 */
function normalizeTestContent(content: string): string {
    // 去除开头的换行，保留内容
    let result = content.replace(/^\n/, '');
    // 确保以换行结尾
    if (!result.endsWith('\n')) {
        result += '\n';
    }
    return result;
}

// ================================ Serializer ================================

/**
 * 生成测试用例部分的代码
 */
function formatTestCases(tests: TestCase[]): string {
    return tests.map((test, index) => {
        const input = test.input.endsWith('\n') ? test.input : test.input + '\n';
        const output = test.output.endsWith('\n') ? test.output : test.output + '\n';
        
        return `
		// case ${index + 1}
		C(\`
${input}\`, \`
${output}\`),`;
    }).join('');
}

/**
 * 更新 test 文件中的测试用例部分
 * 保留文件头部的元数据注释，只更新 Case 数组
 */
export function updateTestFileContent(originalContent: string, tests: TestCase[]): string {
    // 找到 Run(t, []Case{ 和对应的 }, main) 之间的部分并替换
    const startPattern = /Run\(t,\s*\[\]Case\{/;
    const endPattern = /\},\s*main\)/;
    
    const startMatch = originalContent.match(startPattern);
    const endMatch = originalContent.match(endPattern);
    
    if (!startMatch || !endMatch) {
        throw new Error('无法找到测试用例区域');
    }
    
    const startIndex = startMatch.index! + startMatch[0].length;
    const endIndex = endMatch.index!;
    
    const newCases = formatTestCases(tests);
    
    return originalContent.substring(0, startIndex) + 
           newCases + '\n\t' +
           originalContent.substring(endIndex);
}

// ================================ File Operations ================================

/**
 * 从 srcPath 读取对应的 Problem
 * 只有在白名单目录下且 test 文件格式正确时才返回 Problem
 */
export function getProblemFromTestFile(srcPath: string): Problem | null {
    // 检查是否在允许的目录下
    if (!isInAllowedDirectory(srcPath)) {
        return null;
    }

    const testPath = getTestFilePath(srcPath);
    
    if (!fs.existsSync(testPath)) {
        return null;
    }
    
    try {
        const content = fs.readFileSync(testPath, 'utf-8');
        
        // 检查是否是 gocph 生成的 test 文件格式
        if (!isValidTestFile(content)) {
            return null;
        }
        
        return parseTestFile(content, srcPath);
    } catch (error) {
        globalThis.logger?.error('读取 test 文件失败', error);
        return null;
    }
}

/**
 * 检查 test 文件是否是 gocph 生成的格式
 */
function isValidTestFile(content: string): boolean {
    // 必须包含 Contest 和 URL 注释
    const hasContest = /\/\/ Contest:/.test(content);
    const hasUrl = /\/\/ URL:/.test(content);
    // 必须包含 Run(t, []Case{ 结构
    const hasRunCase = /Run\(t,\s*\[\]Case\{/.test(content);
    // 必须包含 testutil 导入
    const hasTestutil = /github\.com\/funcdfs\/algo\/tool\/testutil/.test(content);
    
    return hasContest && hasUrl && hasRunCase && hasTestutil;
}

/**
 * 保存 Problem 到 test 文件（只更新测试用例部分）
 */
export function saveProblemToTestFile(srcPath: string, problem: Problem): void {
    const testPath = getTestFilePath(srcPath);
    
    if (!fs.existsSync(testPath)) {
        throw new Error(`Test 文件不存在: ${testPath}`);
    }
    
    try {
        const originalContent = fs.readFileSync(testPath, 'utf-8');
        const newContent = updateTestFileContent(originalContent, problem.tests);
        fs.writeFileSync(testPath, newContent);
    } catch (error) {
        globalThis.logger?.error('保存 test 文件失败', error);
        throw error;
    }
}
