/**
 * 主进程 ↔ webview 的消息协议。两端都只依赖这一份定义。
 */
import type { FileStatus, Problem, RecentFile, RunResult } from './problem';

export type NotificationType = 'info' | 'success' | 'error' | 'warning';

/** 主进程 → webview */
export type HostMessage =
    | {
          command: 'new-problem';
          problem: Problem | undefined;
          fileStatus: FileStatus;
          mainFilePath?: string;
          testFilePath?: string;
          /** 没有题目可展示时给空状态用的最近文件列表 */
          recentFiles?: RecentFile[];
      }
    | { command: 'compiling-start' }
    | { command: 'compiling-stop' }
    /** srcPath 用于 webview 过滤掉切换文件后仍在流入的旧结果 */
    | { command: 'running'; srcPath: string; id: number }
    | { command: 'not-running' }
    | { command: 'run-single-result'; srcPath: string; result: RunResult }
    | { command: 'notification'; text: string; type: NotificationType };

/** webview → 主进程 */
export type WebviewMessage =
    | { command: 'get-initial-problem' }
    | { command: 'run-all-and-save'; problem: Problem }
    | { command: 'run-single-and-save'; problem: Problem; id: number }
    | { command: 'kill-running' }
    | { command: 'save'; problem: Problem }
    | { command: 'open-file'; filePath: string }
    | { command: 'copy-main-go'; srcPath: string }
    | { command: 'create-void' };

/** 通过 vscode webview API 持久化的 UI 偏好 */
export interface WebviewPersistedState {
    whiteboardExpanded?: boolean;
}
