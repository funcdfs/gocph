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
} from '../../types';
import CaseView from './CaseView';

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


    const fireConfetti = useCallback(() => {
        const count = 200;
        const defaults = {
            origin: { y: 0.7 }
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
    }, [runAll, notify]);

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
                {/* Row 1: Management & Info */}
                <div className="row-1">
                    <div className="file-icons">
                        {mainFilePath && (
                            <i className="codicon codicon-go-to-file clickable-icon" onClick={() => openFile(mainFilePath)} title={`打开 ${getFileName(mainFilePath)}`}></i>
                        )}
                        {testFilePath && (
                            <i className="codicon codicon-beaker clickable-icon" onClick={() => openFile(testFilePath)} title={`打开 ${getFileName(testFilePath)}`}></i>
                        )}
                    </div>
                    <button className="header-btn copy-btn" onClick={copyMainGo}>
                        <i className="codicon codicon-copy"></i> 复制代码
                    </button>
                    <span className="problem-name-text">
                        {problem.name}
                        {compiling && <span className="loader"></span>}
                    </span>
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
                        <i className="codicon codicon-add"></i> 新建测试
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
    const [recentFiles, setRecentFiles] = useState<string[]>([]);
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

    const createProblem = () => {
        vscodeApi.postMessage({ command: 'create-local-problem' });
    };

    // 当前打开的是测试文件
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

    // 不在允许目录下的提示
    if (!problem && showFallback && fileStatus === 'not-allowed') {
        const hasRecent = recentFiles && recentFiles.length > 0;
        return (
            <div className="ui p10">
                <div className="text-center">
                    <p style={{ marginBottom: 12, opacity: 0.8 }}>
                        <i className="codicon codicon-info" style={{ marginRight: 6 }}></i>
                        当前文件不在竞赛目录下
                    </p>
                    {hasRecent ? (
                        <div style={{ textAlign: 'left', marginTop: '20px' }}>
                            <p style={{ opacity: 0.7, fontSize: '12px', marginBottom: '8px' }}>最近编辑的文件：</p>
                            <div className="recent-files-list">
                                {recentFiles.map((path, i) => (
                                    <div
                                        key={i}
                                        className="recent-file-item"
                                        onClick={() => openFile(path)}
                                        style={{
                                            padding: '6px 8px',
                                            cursor: 'pointer',
                                            borderRadius: '4px',
                                            marginBottom: '4px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            fontSize: '12px',
                                            background: 'var(--vscode-editor-inactiveSelectionBackground)',
                                            color: 'var(--vscode-editor-foreground)'
                                        }}
                                        title={path}
                                    >
                                        <i className="codicon codicon-file-code" style={{ marginRight: '6px', opacity: 0.8 }}></i>
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {getRecentFileLabel(path)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <p style={{ marginBottom: 16, opacity: 0.6, fontSize: '12px', lineHeight: 1.6 }}>
                            请打开以下目录中的 .go 文件：<br />
                            <code style={{
                                background: 'var(--vscode-textBlockQuote-background)',
                                padding: '2px 6px',
                                borderRadius: '3px',
                                fontSize: '11px'
                            }}>
                                cf/ atcoder/ acwing/ luogu/ nowcoder/ others/
                            </code>
                        </p>
                    )}
                </div>
            </div>
        );
    }

    // 在允许目录下但没有测试文件的提示
    if (!problem && showFallback && fileStatus === 'valid') {
        return (
            <div className="ui p10">
                <div className="text-center">
                    <p style={{ marginBottom: 16, opacity: 0.7 }}>当前文档没有关联的测试</p>
                    <button className="btn" onClick={createProblem}>
                        <i className="codicon codicon-add"></i> 创建测试
                    </button>
                </div>
            </div>
        );
    }

    // 没有打开文件
    if (!problem && showFallback) {
        return (
            <div className="ui p10">
                <div className="text-center">
                    <p style={{ opacity: 0.6 }}>请打开一个 .go 文件</p>
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
        <Judge
            problem={problem}
            updateProblem={setProblem}
            cases={cases}
            updateCases={setCases}
            mainFilePath={mainFilePath}
            testFilePath={testFilePath}
            openFile={openFile}
        />
    );
}

const container = document.getElementById('app');
const root = createRoot(container!);
root.render(<App />);
