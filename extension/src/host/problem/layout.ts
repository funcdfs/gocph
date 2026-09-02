/**
 * 工作区布局：哪些目录归插件管、题目 URL 落到哪个目录、main.go 与 main_test.go 如何配对。
 * 纯函数，不依赖 vscode。
 */
import * as path from 'path';
import type { FileStatus } from '../../shared/problem';

/** 只有这些目录（任意层级）下的 Go 文件才会被识别为题目 */
export const ALLOWED_DIRECTORIES: readonly string[] = [
    'cf',
    'atcoder',
    'acwing',
    'luogu',
    'nowcoder',
    'others',
    'void',
];

export function isInAllowedDirectory(filePath: string): boolean {
    const dirs = filePath.split(/[\\/]/).slice(0, -1);
    return dirs.some((segment) => ALLOWED_DIRECTORIES.includes(segment));
}

export function isTestFile(filePath: string): boolean {
    return filePath.endsWith('_test.go');
}

/** main.go → main_test.go */
export function testFileOf(srcPath: string): string {
    const { dir, name, ext } = path.parse(srcPath);
    return path.join(dir, `${name}_test${ext}`);
}

/** main_test.go → main.go */
export function sourceFileOf(testPath: string): string {
    return testPath.replace(/_test\.go$/, '.go');
}

export function fileStatusOf(filePath: string | undefined): FileStatus {
    if (!filePath) {
        return 'no-file';
    }
    if (!filePath.endsWith('.go') || !isInAllowedDirectory(filePath)) {
        return 'not-allowed';
    }
    return isTestFile(filePath) ? 'is-test-file' : 'valid';
}

/** 无论传入 main.go 还是 main_test.go，都解析出配对的两个路径 */
export function problemPathsOf(filePath: string): { srcPath: string; testPath: string } {
    const srcPath = isTestFile(filePath) ? sourceFileOf(filePath) : filePath;
    return { srcPath, testPath: testFileOf(srcPath) };
}

// ---------------------------------------------------------------------------
// 题目 URL → 目录
// ---------------------------------------------------------------------------

export interface ProblemDir {
    dirPath: string;
    srcPath: string;
    testPath: string;
}

export function problemDirAt(dirPath: string): ProblemDir {
    return {
        dirPath,
        srcPath: path.join(dirPath, 'main.go'),
        testPath: path.join(dirPath, 'main_test.go'),
    };
}

/**
 * 清理题目名用作目录名：
 * 去掉开头的题号前缀（"A - "、"B. "、"C1 - "），只保留中文、字母、数字，其余折叠成单个下划线。
 */
export function cleanName(raw: string): string {
    return raw
        .replace(/^[A-Za-z]\d*\s*[-.:]\s*/, '')
        .replace(/[^一-龥a-zA-Z0-9]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
}

/**
 * Codeforces: cf/{区间}/{contestId}/{problemId}_{name}
 * AtCoder:    atcoder/{contest}/{name}
 * AcWing:     acwing/{problemId}_{name}
 * Luogu:      luogu/{problemId}_{name}
 * NowCoder:   nowcoder/{name}
 * 其他:       others/{name}
 */
export function problemDirFor(workspaceRoot: string, url: string, problemName: string): ProblemDir {
    const name = cleanName(problemName);
    return problemDirAt(path.join(workspaceRoot, ...relativeDirFor(url, name)));
}

export function relativeDirFor(url: string, name: string): string[] {
    if (url.includes('codeforces.com')) {
        return codeforcesDir(url, name);
    }
    if (url.includes('atcoder.jp')) {
        const contest = url.match(/\/contests\/([^/?#]+)/)?.[1]?.toLowerCase();
        return ['atcoder', contest ?? 'unknown', name];
    }
    if (url.includes('acwing.com')) {
        const id = url.match(/\/problem\/content\/(\d+)/)?.[1];
        return ['acwing', id ? `${id}_${name}` : name];
    }
    if (url.includes('luogu.com.cn')) {
        const id = url.match(/\/problem\/([^/?#]+)/)?.[1];
        return ['luogu', id ? `${id}_${name}` : name];
    }
    if (url.includes('nowcoder.com')) {
        return ['nowcoder', name];
    }
    return ['others', name];
}

/** 每 200 场一个区间目录，例如 1945 → 1800_2000 */
function codeforcesDir(url: string, name: string): string[] {
    const match =
        url.match(/\/contest\/(\d+)\/problem\/([^/?#]+)/) ??
        url.match(/\/problemset\/problem\/(\d+)\/([^/?#]+)/);
    if (!match) {
        return ['cf', 'unknown', name];
    }
    const contestId = match[1];
    const problemId = match[2].toUpperCase();
    const rangeStart = Math.floor(Number(contestId) / 200) * 200;
    return ['cf', `${rangeStart}_${rangeStart + 200}`, contestId, `${problemId}_${name}`];
}
