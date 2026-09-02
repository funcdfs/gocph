import type { FileStatus, Problem, RecentFile, RunResult } from '../shared/problem';

/** 主进程告诉我们的「当前文件是什么」，决定显示题目还是空状态 */
export interface ViewState {
    fileStatus: FileStatus;
    mainFilePath?: string;
    testFilePath?: string;
    recentFiles: RecentFile[];
}

/** 以用例 id 为键的运行结果；新一轮运行开始时整体清空 */
export type Results = Record<number, RunResult>;

/** 所有对题目的修改都走这里，App 借此标记「需要写回文件」 */
export type ProblemUpdater = (updater: (problem: Problem) => Problem) => void;

/** 「全部展开 / 全部收起」：seq 保证连续点同一个按钮也能触发 */
export interface ExpandCommand {
    expanded: boolean;
    seq: number;
}
