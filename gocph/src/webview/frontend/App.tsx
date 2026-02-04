import { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
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


function Judge(props: {
    problem: Problem;
    updateProblem: (problem: Problem) => void;
    cases: Case[];
    updateCases: (cases: Case[]) => void;
    mainFilePath?: string;
    testFilePath?: string;
    openFile: (path: string) => void;
}) {
    const { problem, cases, updateProblem, updateCases, mainFilePath, testFilePath, openFile } = props;

    const [focusLast, setFocusLast] = useState<boolean>(false);
    const [forceRunning, setForceRunning] = useState<number | false>(false);
    const [compiling, setCompiling] = useState<boolean>(false);
    const [notification, setNotification] = useState<NotificationState>(null);

    const numPassed = cases.filter((c) => c.result?.pass === true).length;
    const total = cases.length;

    // 同步 cases 到 problem.tests
    useEffect(() => {
        const testCases: TestCase[] = cases.map((c) => c.testcase);
        updateProblem({ ...problem, tests: testCases });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cases]);

    const sendMessage = useCallback((message: WebviewToVSEvent) => {
        vscodeApi.postMessage(message);
    }, []);

    const runAll = useCallback(() => {
        sendMessage({ command: 'run-all-and-save', problem });
    }, [problem, sendMessage]);

    useEffect(() => {
        const handler = (event: MessageEvent) => {
            const data: VSToWebViewMessage = event.data;
            switch (data.command) {
                case 'running':
                    setForceRunning((data as RunningCommand).id);
                    break;
                case 'run-all':
                    runAll();
                    break;
                case 'compiling-start':
                    setCompiling(true);
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
    }, [runAll]);

    const rerun = useCallback((id: number, input: string, output: string) => {
        const idx = problem.tests.findIndex((t) => t.id === id);
        if (idx === -1) return;
        problem.tests[idx].input = input;
        problem.tests[idx].output = output;
        sendMessage({ command: 'run-single-and-save', problem, id });
    }, [problem, sendMessage]);

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

    const notify = useCallback((text: string, type: NotificationType = 'info') => {
        clearTimeout(notificationTimeout!);
        setNotification({ text, type });
        notificationTimeout = setTimeout(() => setNotification(null), 2500);
    }, []);

    const stop = useCallback(() => {
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
                {/* Row 1: Management & Info (Formerly Row 2) */}
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

                {/* Row 2: Execution Actions (Formerly Row 1) */}
                <div className="row-2">
                    <button className="header-btn run-btn" onClick={runAll} title="全部运行 (Alt+1)">
                        <i className="codicon codicon-run-all"></i> 全部运行
                    </button>
                    <div className="row-spacer-25"></div>
                    <button className="header-btn stop-btn" onClick={stop} title="停止运行 (Alt+2)">
                        <i className="codicon codicon-debug-stop"></i> 停止
                    </button>
                </div>

                {/* Row 3: Navigation & Status */}
                <div className="row-3">
                    <button className="header-btn new-btn" onClick={newCase}>
                        <i className="codicon codicon-add"></i> 新建测试
                    </button>
                    <div className="row-spacer-flex"></div>
                    <i className="codicon codicon-chevron-up header-icon-label" onClick={collapseAll} title="收起来"></i>
                    <i className="codicon codicon-chevron-down header-icon-label" onClick={expandAll} title="全部展开"></i>
                    <div className={`pass-rate-tag ${numPassed === total && total > 0 ? 'pass-all' : ''}`}>
                        {numPassed} / {total} 通过
                    </div>
                </div>

                {/* Row 4: Controls */}
                <div className="row-4">
                    <div className="row-spacer-flex"></div>
                    <div className="toggle-fold-icon" onClick={toggleRegions} title="切换 Region 折叠 (Alt+3)">
                        <i className="codicon codicon-folding-expanded"></i>
                    </div>
                </div>
            </div>

            <div className="results-container">
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
        return (
            <div className="ui p10">
                <div className="text-center">
                    <p style={{ marginBottom: 12, opacity: 0.8 }}>
                        <i className="codicon codicon-info" style={{ marginRight: 6 }}></i>
                        当前文件不在竞赛目录下
                    </p>
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
