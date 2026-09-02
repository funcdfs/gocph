/**
 * 领域模型：主进程与 webview 共用。
 * 本目录禁止引入 vscode 或 node 内置模块（eslint 会拦截）。
 */

export interface TestCase {
    id: number;
    input: string;
    output: string;
}

export interface Problem {
    name: string;
    group: string;
    url: string;
    /** main.go 的绝对路径，也是题目的唯一标识 */
    srcPath: string;
    tests: TestCase[];
    /** main_test.go 末尾块注释里的白板内容 */
    whiteboard: string;
}

export interface Run {
    stdout: string;
    stderr: string;
    code: number | null;
    signal: string | null;
    /** 运行耗时（毫秒） */
    time: number;
    timeOut: boolean;
}

export interface RunResult extends Run {
    id: number;
    pass: boolean;
}

/**
 * 当前活动文件与插件的关系：
 * valid 题目目录下的 main.go；is-test-file 题目目录下的 *_test.go；
 * not-allowed 不在题目目录或不是 Go 文件；no-file 没有打开任何文件
 */
export type FileStatus = 'valid' | 'not-allowed' | 'no-file' | 'is-test-file';

export interface RecentFile {
    path: string;
    modifiedTime: number;
}
