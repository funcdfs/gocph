/** Valid name for a VS Code preference section for the extension */
export type prefSection =
    | '超时时间'
    | '编译成功时隐藏警告'
    | '忽略标准错误'
    | '编译参数'
    | 'Go命令'
    | '自动显示结果面板'
    | 'Companion端口'
    | '自动折叠骨架';

export type Language = {
    name: LangNames;
    compiler: string;
    args: string[];
    skipCompile: boolean;
};

export type LangNames = 'go';

export type TestCase = {
    input: string;
    output: string;
    id: number;
};

export type Problem = {
    name: string;
    url: string;
    interactive: boolean;
    memoryLimit: number;
    timeLimit: number;
    group: string;
    tests: TestCase[];
    srcPath: string;
    local?: boolean;
    whiteboard?: string; // 白板内容
};

export type Case = {
    id: number;
    result: RunResult | null;
    testcase: TestCase;
};

export type Run = {
    stdout: string;
    stderr: string;
    code: number | null;
    signal: string | null;
    time: number;
    timeOut: boolean;
};

export type RunResult = {
    pass: boolean | null;
    id: number;
} & Run;

export type WebviewMessageCommon = {
    problem: Problem;
};

export type RunSingleCommand = {
    command: 'run-single-and-save';
    id: number;
} & WebviewMessageCommon;

export type RunAllCommand = {
    command: 'run-all-and-save';
} & WebviewMessageCommon;

export type KillRunningCommand = {
    command: 'kill-running';
} & WebviewMessageCommon;

export type SaveCommand = {
    command: 'save';
} & WebviewMessageCommon;

export type DeleteTcsCommand = {
    command: 'delete-tcs';
} & WebviewMessageCommon;

export type GetInitialProblem = {
    command: 'get-initial-problem';
};

export type CreateLocalProblem = {
    command: 'create-local-problem';
};

export type OpenFileCommand = {
    command: 'open-file';
    filePath: string;
};

export type CopyMainGoCommand = {
    command: 'copy-main-go';
    problem: Problem;
};

export type CreateBlankProblemCommand = {
    command: 'create-blank-problem';
};

export type CreateVoidCommand = {
    command: 'create-void';
};

export type WebviewToVSEvent =
    | RunAllCommand
    | GetInitialProblem
    | CreateLocalProblem
    | RunSingleCommand
    | KillRunningCommand
    | SaveCommand
    | DeleteTcsCommand
    | OpenFileCommand
    | CopyMainGoCommand
    | CreateBlankProblemCommand
    | CreateVoidCommand;

export type RunningCommand = {
    command: 'running';
    id: number;
} & WebviewMessageCommon;

export type NotRunningCommand = {
    command: 'not-running';
};

export type ResultCommand = {
    command: 'run-single-result';
    result: RunResult;
} & WebviewMessageCommon;

export type CompilingStartCommand = {
    command: 'compiling-start';
};

export type CompilingStopCommand = {
    command: 'compiling-stop';
};

export type RunAllInWebViewCommand = {
    command: 'run-all';
};

export type RecentFileInfo = {
    path: string;
    modifiedTime: number; // Unix timestamp in milliseconds
};

export type NewProblemCommand = {
    command: 'new-problem';
    problem: Problem | undefined;
    /** 文件状态：'valid' 有效问题, 'not-allowed' 不在允许目录, 'no-file' 没有打开文件, 'is-test-file' 当前是测试文件 */
    fileStatus?: 'valid' | 'not-allowed' | 'no-file' | 'is-test-file';
    /** 当 fileStatus 为 'is-test-file' 时，对应的 main.go 路径 */
    mainFilePath?: string;
    /** 测试文件路径 */
    testFilePath?: string;
    /** 最近使用的文件列表（包含路径和修改时间） */
    recentFiles?: RecentFileInfo[];
};

export type NotificationCommand = {
    command: 'notification';
    text: string;
    type: 'info' | 'success' | 'error' | 'warning';
};

export type VSToWebViewMessage =
    | ResultCommand
    | RunningCommand
    | RunAllInWebViewCommand
    | CompilingStartCommand
    | CompilingStopCommand
    | NotRunningCommand
    | NewProblemCommand
    | NotificationCommand;

export type WebViewpersistenceState = {
    placeholder?: boolean;
};
