import { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import confetti from 'canvas-confetti';
import {
    Problem,
    WebviewToVSEvent,
    TestCase,
    Case,
    VSToWebViewMessage,
    ResultCommand,
    RunningCommand,
    WebViewpersistenceState,
    RecentFileInfo,
} from '../../types';
import CaseView from './CaseView';
import GlobalDrawer from './GlobalDrawer';

// 通知类型
type NotificationType = 'info' | 'success' | 'error' | 'warning';
type NotificationState = { text: string; type: NotificationType } | null;

let notificationTimeout: NodeJS.Timeout | undefined = undefined;

declare const vscodeApi: {
    postMessage: (message: WebviewToVSEvent) => void;
    getState: () => WebViewpersistenceState | undefined;
    setState: (state: WebViewpersistenceState) => void;
};

/** 从路径中提取文件名 */
function getFileName(filePath: string): string {
    return filePath.split(/[/\\]/).pop() || filePath;
}

function getRecentFileLabel(filePath: string): string {
    const parts = filePath.split(/[/\\]/);
    const fileName = parts.pop() || filePath;
    const parentDir = parts.pop();
    return parentDir ? `${fileName} ${parentDir}` : fileName;
}

/** 格式化相对时间 */
function formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}天前`;
    if (hours > 0) return `${hours}小时前`;
    if (minutes > 0) return `${minutes}分钟前`;
    return '刚刚';
}


function Judge(props: {
    problem: Problem;
    updateProblem: (problem: Problem) => void;
    cases: Case[];
    updateCases: React.Dispatch<React.SetStateAction<Case[]>>;
    mainFilePath?: string;
    testFilePath?: string;
    openFile: (path: string) => void;
}) {
    const { problem, cases, updateProblem, updateCases, mainFilePath, testFilePath, openFile } = props;

    const [focusLast, setFocusLast] = useState<boolean>(false);
    const [forceRunning, setForceRunning] = useState<number | false>(false);
    const [compiling, setCompiling] = useState<boolean>(false);
    const [executing, setExecuting] = useState<boolean>(false);
    const [notification, setNotification] = useState<NotificationState>(null);

    const numPassed = cases.filter((c) => c.result?.pass === true).length;
    const total = cases.length;

    // 处理白板内容变化
    const handleWhiteboardChange = useCallback((content: string) => {
        updateProblem({ ...problem, whiteboard: content });
    }, [problem, updateProblem]);


    const fireConfetti = useCallback(() => {
        const count = 200;
        const defaults = {
            origin: { y: 0.7 },
            ticks: 60,
            gravity: 1.2,
            decay: 0.92,
        };

        function fire(particleRatio: number, opts: confetti.Options) {
            confetti({
                ...defaults,
                ...opts,
                particleCount: Math.floor(count * particleRatio)
            });
        }

        fire(0.25, {
            spread: 26,
            startVelocity: 55,
        });
        fire(0.2, {
            spread: 60,
        });
        fire(0.35, {
            spread: 100,
            decay: 0.91,
            scalar: 0.8
        });
        fire(0.1, {
            spread: 120,
            startVelocity: 25,
            decay: 0.92,
            scalar: 1.2
        });
        fire(0.1, {
            spread: 120,
            startVelocity: 45,
        });
    }, []);

    const isRunning = compiling || executing;
    // Track if a run session is active to determine when to check for success
    const [waitingForResults, setWaitingForResults] = useState<boolean>(false);

    useEffect(() => {
        if (isRunning) {
            setWaitingForResults(true);
        } else if (waitingForResults) {
            // Once running stops, check if all cases passed
            // The check happens here (or when numPassed updates while waitingForResults is true)
            if (total > 0 && numPassed === total) {
                fireConfetti();
                setWaitingForResults(false); // Reset to prevent double firing
            }
        }
    }, [isRunning, numPassed, total, fireConfetti, waitingForResults]);

    const sendMessage = useCallback((message: WebviewToVSEvent) => {
        vscodeApi.postMessage(message);
    }, []);

    const notify = useCallback((text: string, type: NotificationType = 'info') => {
        clearTimeout(notificationTimeout!);
        setNotification({ text, type });
        notificationTimeout = setTimeout(() => setNotification(null), 2500);
    }, []);

    const runAll = useCallback(() => {
        // 开始运行时立即清除所有结果状态，避免旧状态导致提前触发烟花
        updateCases(prev => prev.map(c => ({ ...c, result: null })));
        sendMessage({ command: 'run-all-and-save', problem });
    }, [problem, sendMessage, updateCases]);

    const rerun = useCallback((id: number, input: string, output: string) => {
        const idx = problem.tests.findIndex((t) => t.id === id);
        if (idx === -1) return;
        problem.tests[idx].input = input;
        problem.tests[idx].output = output;

        // 清除当前用例的结果状态
        updateCases(prev => prev.map(c => c.id === id ? { ...c, result: null } : c));

        sendMessage({ command: 'run-single-and-save', problem, id });
    }, [problem, sendMessage, updateCases]);

    const remove = useCallback((id: number) => {
        updateCases(cases.filter((c) => c.id !== id));
    }, [cases, updateCases]);

    const newCase = useCallback(() => {
        const id = Date.now();
        updateCases([
            ...cases,
            { id, result: null, testcase: { id, input: '', output: '' } },
        ]);
        setFocusLast(true);
    }, [cases, updateCases]);

    const stop = useCallback(() => {
        setExecuting(false);
        setCompiling(false);
        notify('已停止', 'warning');
        sendMessage({ command: 'kill-running', problem });
    }, [problem, sendMessage, notify]);

    const copyMainGo = useCallback(() => {
        sendMessage({ command: 'copy-main-go', problem });
    }, [problem, sendMessage]);

    const createVoid = useCallback(() => {
        sendMessage({ command: 'create-void' });
    }, [sendMessage]);

    const toggleRegions = useCallback(() => {
        sendMessage({ command: 'toggle-regions' });
    }, [sendMessage]);

    const getRunningProp = useCallback((c: Case) => {
        if (forceRunning === c.id) {
            setTimeout(() => setForceRunning(false), 100);
            return true;
        }
        return false;
    }, [forceRunning]);

    const updateCase = useCallback((id: number, input: string, output: string) => {
        updateCases(
            cases.map((c) =>
                c.id === id
                    ? { ...c, testcase: { id, input, output } }
                    : c
            )
        );
    }, [cases, updateCases]);

    // 同步 cases 到 problem.tests
    useEffect(() => {
        const testCases: TestCase[] = cases.map((c) => c.testcase);
        updateProblem({ ...problem, tests: testCases });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cases]);

    useEffect(() => {
        const handler = (event: MessageEvent) => {
            const data: VSToWebViewMessage = event.data;
            switch (data.command) {
                case 'running':
                    setForceRunning((data as RunningCommand).id);
                    setExecuting(true);
                    break;
                case 'not-running':
                    setExecuting(false);
                    setForceRunning(false);
                    break;
                case 'run-all':
                    runAll();
                    break;
                case 'compiling-start':
                    setCompiling(true);
                    // 编译开始时也尝试清除结果，并使用函数式更新避免闭包陷阱
                    updateCases(prev => prev.map(c => ({ ...c, result: null })));
                    break;
                case 'compiling-stop':
                    setCompiling(false);
                    break;
                case 'notification':
                    notify(data.text, data.type);
                    break;
            }
        };
        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, [runAll, notify, updateCases]);

    const hasTimeout = cases.some(
        (c) => c.result?.timeOut || c.result?.signal === 'SIGTERM'
    );

    // 全局展开/收起状态
    const [allExpanded, setAllExpanded] = useState<boolean | null>(null);

    const expandAll = useCallback(() => {
        setAllExpanded(true);
        setTimeout(() => setAllExpanded(null), 100);
    }, []);

    const collapseAll = useCallback(() => {
        setAllExpanded(false);
        setTimeout(() => setAllExpanded(null), 100);
    }, []);

    return (
        <div className="ui">
            {notification && (
                <div className={`notification notification-${notification.type}`}>
                    {notification.type === 'success' && <i className="codicon codicon-check"></i>}
                    {notification.type === 'error' && <i className="codicon codicon-error"></i>}
                    {notification.type === 'warning' && <i className="codicon codicon-warning"></i>}
                    {notification.type === 'info' && <i className="codicon codicon-info"></i>}
                    <span>{notification.text}</span>
                </div>
            )}

            <div className="header-container sticky-top">
                {/* Row 1: 固定布局 - 文件图标 + 复制代码 + 问题名称（可缩减）+ 新建 void（固定） */}
                <div className="row-1-fixed">
                    <div className="file-icons">
                        {mainFilePath && (
                            <i className="codicon codicon-go-to-file clickable-icon" onClick={() => openFile(mainFilePath)} title={`打开 ${getFileName(mainFilePath)}`}></i>
                        )}
                        {testFilePath && (
                            <i className="codicon codicon-beaker clickable-icon" onClick={() => openFile(testFilePath)} title={`打开 ${getFileName(testFilePath)}`}></i>
                        )}
                    </div>
                    <button className="header-btn copy-btn" onClick={copyMainGo}>
                        <i className="codicon codicon-copy"></i> 复制
                    </button>
                    <span className="problem-name-text-flex">
                        {problem.name}
                        {compiling && <span className="loader"></span>}
                    </span>
                    <button className="header-btn void-btn icon-only-btn" onClick={createVoid} title="创建新的 void 文件">
                        <i className="codicon codicon-add"></i>
                    </button>
                </div>

                {/* Row 2: Execution Actions */}
                <div className="row-2">
                    <button className="header-btn run-btn" onClick={runAll} title="全部运行 (Alt+1)">
                        <i className="codicon codicon-run-all"></i> 全部运行
                    </button>
                    <div className="row-spacer-25"></div>
                    <button
                        className="header-btn stop-btn"
                        onClick={stop}
                        title="停止运行 (Alt+2)"
                        disabled={!compiling && !executing}
                    >
                        <i className="codicon codicon-debug-stop"></i> 停止
                    </button>
                </div>
            </div>

            <div className="results-container">
                <div className="new-test-row">
                    <button className="header-btn new-btn" onClick={newCase}>
                        <i className="codicon codicon-add"></i> 添加测试样例
                    </button>
                    <div className="row-spacer-flex"></div>
                    <div className="header-controls-group">
                        <i className="codicon codicon-chevron-up header-icon-label" onClick={collapseAll} title="收起来"></i>
                        <i className="codicon codicon-chevron-down header-icon-label" onClick={expandAll} title="全部展开"></i>
                        <div className="toggle-fold-icon" onClick={toggleRegions} title="切换 Region 折叠 (Alt+3)">
                            <i className="codicon codicon-folding-expanded"></i>
                        </div>
                        <div className={`pass-rate-tag ${numPassed === total && total > 0 ? 'pass-all' : ''}`}>
                            {numPassed} / {total} 通过
                        </div>
                    </div>
                </div>
                {cases.map((c, i) => (
                    <CaseView
                        key={c.id}
                        num={i + 1}
                        case={c}
                        rerun={rerun}
                        remove={remove}
                        notify={notify}
                        doFocus={focusLast && i === cases.length - 1}
                        forceRunning={getRunningProp(c)}
                        updateCase={updateCase}
                        forceExpanded={allExpanded}
                    />
                ))}
            </div>

            {hasTimeout && (
                <div className="timeout-suggestion margin-10">
                    <h5><i className="codicon codicon-warning"></i> 超时或 SIGTERM？</h5>
                    <p>检查是否全部正确的读入所有的数据。</p>
                </div>
            )}
            
            <GlobalDrawer 
                whiteboard={problem.whiteboard} 
                onWhiteboardChange={handleWhiteboardChange}
            />
        </div>
    );
}

const getCasesFromProblem = (problem: Problem | undefined): Case[] => {
    if (!problem) return [];
    return problem.tests.map((t) => ({ id: t.id, result: null, testcase: t }));
};

function App() {
    const [problem, setProblem] = useState<Problem | undefined>(undefined);
    const [cases, setCases] = useState<Case[]>([]);
    const [deferSaveTimer, setDeferSaveTimer] = useState<number | null>(null);
    const [showFallback, setShowFallback] = useState<boolean>(false);
    const [recentFiles, setRecentFiles] = useState<RecentFileInfo[]>([]);
    const [fileStatus, setFileStatus] = useState<'valid' | 'not-allowed' | 'no-file' | 'is-test-file'>('no-file');
    const [mainFilePath, setMainFilePath] = useState<string | undefined>(undefined);
    const [testFilePath, setTestFilePath] = useState<string | undefined>(undefined);

    const openFile = useCallback((filePath: string) => {
        vscodeApi.postMessage({ command: 'open-file', filePath });
    }, []);

    const save = useCallback(() => {
        if (problem) {
            vscodeApi.postMessage({ command: 'save', problem });
        }
    }, [problem]);

    const handleRunSingleResult = useCallback((data: ResultCommand) => {
        setCases((prevCases) => {
            const idx = prevCases.findIndex((c) => c.id === data.result.id);
            if (idx === -1) return prevCases;
            const newCases = [...prevCases];
            newCases[idx].result = data.result;
            return newCases;
        });
    }, []);

    useEffect(() => {
        if (deferSaveTimer !== null) clearTimeout(deferSaveTimer);
        const id = window.setTimeout(() => {
            setDeferSaveTimer(null);
            save();
        }, 500);
        setDeferSaveTimer(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [problem]);

    useEffect(() => {
        const handler = (event: MessageEvent) => {
            const data: VSToWebViewMessage = event.data;
            switch (data.command) {
                case 'new-problem':
                    if (!data.problem) setShowFallback(true);
                    setProblem(data.problem);
                    setCases(getCasesFromProblem(data.problem));
                    if (data.fileStatus) {
                        setFileStatus(data.fileStatus);
                    }
                    if (data.mainFilePath !== undefined) {
                        setMainFilePath(data.mainFilePath);
                    }
                    if (data.testFilePath !== undefined) {
                        setTestFilePath(data.testFilePath);
                    }
                    if (data.recentFiles !== undefined) {
                        setRecentFiles(data.recentFiles);
                    }
                    break;
                case 'run-single-result':
                    handleRunSingleResult(data);
                    break;
            }
        };
        window.addEventListener('message', handler);

        // Request initial problem data when React app mounts
        vscodeApi.postMessage({ command: 'get-initial-problem' });

        return () => window.removeEventListener('message', handler);
    }, [handleRunSingleResult]);

    const createVoid = useCallback(() => {
        vscodeApi.postMessage({ command: 'create-void' });
    }, []);

    // 当前打开的是测试文件 - 显示跳转到 main.go 的页面
    if (!problem && showFallback && fileStatus === 'is-test-file' && mainFilePath) {
        return (
            <div className="ui p10">
                <div className="text-center">
                    <p style={{ marginBottom: 12, opacity: 0.8 }}>
                        <i className="codicon codicon-beaker" style={{ marginRight: 6 }}></i>
                        当前是测试文件
                    </p>
                    <button className="btn" onClick={() => openFile(mainFilePath)}>
                        <i className="codicon codicon-go-to-file"></i> 打开 {getFileName(mainFilePath)}
                    </button>
                </div>
            </div>
        );
    }

    // 其他所有情况 - 显示创建 Void 按钮 + 最近文件列表
    if (!problem && showFallback) {
        const hasRecent = recentFiles && recentFiles.length > 0;
        return (
            <div className="ui p10">
                <div className="text-center">
                    {/* 创建 Void 按钮 - 置顶居中 */}
                    <button 
                        className="btn" 
                        onClick={createVoid}
                        style={{ 
                            marginBottom: hasRecent ? '24px' : '0',
                            fontSize: '13px',
                            padding: '8px 16px'
                        }}
                    >
                        <i className="codicon codicon-add"></i> 创建 Void
                    </button>

                    {/* 最近文件列表 */}
                    {hasRecent && (
                        <div style={{ marginTop: '24px' }}>
                            <p style={{ opacity: 0.7, fontSize: '12px', marginBottom: '12px' }}>最近编辑：</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {recentFiles.map((fileInfo, i) => (
                                    <div
                                        key={i}
                                        onClick={() => openFile(fileInfo.path)}
                                        style={{
                                            padding: '8px 10px',
                                            cursor: 'pointer',
                                            borderRadius: '4px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            fontSize: '12px',
                                            background: 'var(--vscode-editor-inactiveSelectionBackground)',
                                            color: 'var(--vscode-editor-foreground)',
                                            transition: 'background 0.15s ease'
                                        }}
                                        title={fileInfo.path}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'var(--vscode-list-hoverBackground)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'var(--vscode-editor-inactiveSelectionBackground)';
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden', flex: 1 }}>
                                            <i className="codicon codicon-file-code" style={{ marginRight: '8px', opacity: 0.8, flexShrink: 0 }}></i>
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {getRecentFileLabel(fileInfo.path)}
                                            </span>
                                        </div>
                                        <span style={{ 
                                            opacity: 0.6, 
                                            fontSize: '11px', 
                                            marginLeft: '8px',
                                            flexShrink: 0
                                        }}>
                                            {formatRelativeTime(fileInfo.modifiedTime)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (!problem) {
        return (
            <div className="ui p10">
                <p style={{ opacity: 0.5 }}>加载中...</p>
            </div>
        );
    }

    return (
        <>
            <Judge
                problem={problem}
                updateProblem={setProblem}
                cases={cases}
                updateCases={setCases}
                mainFilePath={mainFilePath}
                testFilePath={testFilePath}
                openFile={openFile}
            />
        </>
    );
}

const container = document.getElementById('app');
const root = createRoot(container!);
root.render(<App />);
