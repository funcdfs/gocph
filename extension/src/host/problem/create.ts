/**
 * 在磁盘上创建题目文件。三个入口共用同一套模板：
 * Companion 接题（完整目录）、void 空白题（时间戳目录）、Alt+1 补建用例文件。
 */
import * as fs from 'fs';
import * as path from 'path';
import { problemDirAt, testFileOf, type ProblemDir } from './layout';
import { renderMainGo, renderTestGo, type ProblemSeed } from './template';
import { formatDirTimestamp } from './time';

const EMPTY_CASE = { input: '', output: '' };

export function dirExists(dir: ProblemDir): boolean {
    return fs.existsSync(dir.dirPath) || fs.existsSync(dir.srcPath);
}

/** 在 basePath 后追加 _2、_3… 直到目录不存在 */
export function nextAvailableDir(basePath: string): string {
    let index = 2;
    while (fs.existsSync(`${basePath}_${index}`)) {
        index++;
    }
    return `${basePath}_${index}`;
}

/** 写入 main.go 与 main_test.go；目录不存在则创建，已有文件会被覆盖 */
export function writeProblemFiles(dir: ProblemDir, seed: ProblemSeed, now: Date = new Date()): void {
    fs.mkdirSync(dir.dirPath, { recursive: true });
    fs.writeFileSync(dir.srcPath, renderMainGo(seed.url, now));
    fs.writeFileSync(dir.testPath, renderTestGo(seed, now));
}

/** void/<时间戳>/ 下的空白题目，随手写代码用 */
export function createVoidProblem(workspaceRoot: string, now: Date = new Date()): ProblemDir {
    const stamp = formatDirTimestamp(now);
    const dir = problemDirAt(path.join(workspaceRoot, 'void', stamp));
    fs.mkdirSync(dir.dirPath, { recursive: true });
    fs.writeFileSync(dir.srcPath, renderMainGo(undefined, now));
    fs.writeFileSync(
        dir.testPath,
        renderTestGo({ name: stamp, group: 'Void', url: 'https://github.com/funcdfs', tests: [EMPTY_CASE] }, now),
    );
    return dir;
}

/**
 * 给已有的 main.go 补一个带空用例的 main_test.go。
 * 用例文件已存在时不做任何事并返回 false，避免覆盖用户自己写的测试。
 */
export function createTestFileFor(srcPath: string, now: Date = new Date()): boolean {
    const testPath = testFileOf(srcPath);
    if (fs.existsSync(testPath)) {
        return false;
    }
    const name = path.basename(srcPath, '.go');
    fs.writeFileSync(testPath, renderTestGo({ name, group: 'Local', url: srcPath, tests: [EMPTY_CASE] }, now));
    return true;
}
