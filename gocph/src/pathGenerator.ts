/**
 * Path Generator 模块
 * 根据题目 URL 和名称计算目标文件路径
 * 与根目录 gen.go 的路径生成逻辑保持一致
 */

import * as path from 'path';

// ================================ Types ================================

export type Platform = 'codeforces' | 'atcoder' | 'acwing' | 'luogu' | 'nowcoder' | 'other';

export interface PathResult {
    dirPath: string;
    srcPath: string;
    testPath: string;
}

// ================================ Platform Detection ================================

export function getPlatform(url: string): Platform {
    if (url.includes('codeforces.com')) return 'codeforces';
    if (url.includes('atcoder.jp')) return 'atcoder';
    if (url.includes('acwing.com')) return 'acwing';
    if (url.includes('luogu.com.cn')) return 'luogu';
    if (url.includes('nowcoder.com')) return 'nowcoder';
    return 'other';
}

// ================================ Name Cleaning ================================

/**
 * 清理题目名称，与 gen.go 的 cleanName 函数保持一致
 * - 移除开头的题号前缀 (如 "A - ", "B. ", "C1 - " 等)
 * - 保留中文、字母、数字，其他替换为下划线
 * - 合并连续下划线，去除首尾下划线
 */
export function cleanName(s: string): string {
    // 移除开头的题号前缀
    let result = s.replace(/^[A-Za-z]\d*\s*[-.:]\s*/, '');
    // 保留中文、字母、数字
    result = result.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]+/g, '_');
    // 合并连续下划线
    result = result.replace(/_+/g, '_');
    // 去除首尾下划线
    return result.replace(/^_|_$/g, '');
}

// ================================ Path Generation ================================

/**
 * 生成完整的文件路径
 * 
 * Codeforces: cf/{区间}/{contestId}/{problemId}_{name}/
 * AtCoder: atcoder/{contest}/{name}/
 * AcWing: acwing/{problemId}_{name}/
 * Luogu: luogu/{problemId}_{name}/
 * NowCoder: nowcoder/{name}/
 * Other: others/{name}/
 */
export function generatePaths(workspaceRoot: string, url: string, problemName: string): PathResult | null {
    const platform = getPlatform(url);
    const cleanedName = cleanName(problemName);

    let dirPath: string;

    switch (platform) {
        case 'codeforces':
            dirPath = cfPath(workspaceRoot, url, cleanedName);
            break;
        case 'atcoder':
            dirPath = atcoderPath(workspaceRoot, url, cleanedName);
            break;
        case 'acwing':
            dirPath = acwingPath(workspaceRoot, url, cleanedName);
            break;
        case 'luogu':
            dirPath = luoguPath(workspaceRoot, url, cleanedName);
            break;
        case 'nowcoder':
            dirPath = path.join(workspaceRoot, 'nowcoder', cleanedName);
            break;
        default:
            dirPath = path.join(workspaceRoot, 'others', cleanedName);
    }

    return {
        dirPath,
        srcPath: path.join(dirPath, 'main.go'),
        testPath: path.join(dirPath, 'main_test.go'),
    };
}

// ================================ Platform-specific Paths ================================

// Codeforces: cf/{区间}/{contestId}/{problemId}_{name}/
function cfPath(workspaceRoot: string, url: string, name: string): string {
    const parts = url.split('/');
    let contestId = '';
    let problemId = '';

    for (let i = 0; i < parts.length; i++) {
        if ((parts[i] === 'contest' || parts[i] === 'problemset') && i + 1 < parts.length) {
            // For problemset URLs, the next part is 'problem', so we need to skip it
            if (parts[i] === 'problemset' && parts[i + 1] === 'problem' && i + 2 < parts.length) {
                contestId = parts[i + 2];
            } else if (parts[i] === 'contest') {
                contestId = parts[i + 1];
            }
        }
        if (parts[i] === 'problem' && i + 1 < parts.length) {
            problemId = parts[i + 1].toUpperCase();
        }
    }

    if (!contestId) {
        return path.join(workspaceRoot, 'cf', 'unknown', name);
    }

    const contestNum = parseInt(contestId, 10);
    if (isNaN(contestNum)) {
        return path.join(workspaceRoot, 'cf', 'unknown', name);
    }

    const rangeStart = Math.floor(contestNum / 200) * 200;
    const rangeDir = `${rangeStart}_${rangeStart + 200}`;
    const folderName = problemId ? `${problemId}_${name}` : name;

    return path.join(workspaceRoot, 'cf', rangeDir, contestId, folderName);
}

// AtCoder: atcoder/{contest}/{name}/
function atcoderPath(workspaceRoot: string, url: string, name: string): string {
    const parts = url.split('/');
    let contest = '';

    for (let i = 0; i < parts.length; i++) {
        if (parts[i] === 'contests' && i + 1 < parts.length) {
            contest = parts[i + 1].toLowerCase();
            break;
        }
    }

    if (!contest) {
        return path.join(workspaceRoot, 'atcoder', 'unknown', name);
    }
    return path.join(workspaceRoot, 'atcoder', contest, name);
}

// AcWing: acwing/{problemId}_{name}/
function acwingPath(workspaceRoot: string, url: string, name: string): string {
    const parts = url.split('/');
    let problemId = '';

    for (let i = 0; i < parts.length; i++) {
        if (parts[i] === 'problem' && i + 2 < parts.length && parts[i + 1] === 'content') {
            problemId = parts[i + 2].replace(/\/$/, '');
            break;
        }
    }

    if (!problemId) {
        return path.join(workspaceRoot, 'acwing', name);
    }
    return path.join(workspaceRoot, 'acwing', `${problemId}_${name}`);
}

// Luogu: luogu/{problemId}_{name}/
function luoguPath(workspaceRoot: string, url: string, name: string): string {
    const parts = url.split('/');
    let problemId = '';

    for (let i = 0; i < parts.length; i++) {
        if (parts[i] === 'problem' && i + 1 < parts.length) {
            problemId = parts[i + 1];
            break;
        }
    }

    if (!problemId) {
        return path.join(workspaceRoot, 'luogu', name);
    }
    return path.join(workspaceRoot, 'luogu', `${problemId}_${name}`);
}
