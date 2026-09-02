/**
 * webview 根组件：持有全部状态（题目、结果、运行中标记、通知），
 * 所有发往主进程的消息也都从这里发出；子组件只通过回调表达意图。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Problem } from '../shared/problem';
import type { NotificationType } from '../shared/protocol';
import { EmptyState } from './components/EmptyState';
import { Judge } from './components/Judge';
import type { ProblemUpdater, Results, ViewState } from './state';
import { host, useHostMessages } from './vscode';

const TOAST_MS = 2500;
const SAVE_DEBOUNCE_MS = 500;

interface ToastState {
    text: string;
    type: NotificationType;
}

const TOAST_ICON: Record<NotificationType, string> = {
    success: 'check',
    error: 'error',
    warning: 'warning',
    info: 'info',
};

export function App() {
    /** null 表示还没收到主进程的第一条 new-problem */
    const [view, setView] = useState<ViewState | null>(null);
    const [problem, setProblem] = useState<Problem | undefined>();
    const [results, setResults] = useState<Results>({});
    const [runningId, setRunningId] = useState<number | null>(null);
    const [compiling, setCompiling] = useState(false);
    const [toast, setToast] = useState<ToastState | null>(null);

    /** 面板里改过、还没写回文件 */
    const dirty = useRef(false);
    const problemRef = useRef(problem);
    problemRef.current = problem;
    const toastTimer = useRef<number>();

    const notify = useCallback((text: string, type: NotificationType = 'info') => {
        window.clearTimeout(toastTimer.current);
        setToast({ text, type });
        toastTimer.current = window.setTimeout(() => setToast(null), TOAST_MS);
    }, []);

    /** 把未落盘的修改立刻写回；切换文件、面板失焦（用户点回编辑器）时调用 */
    const flushSave = useCallback(() => {
        if (dirty.current && problemRef.current) {
            dirty.current = false;
            host.post({ command: 'save', problem: problemRef.current });
        }
    }, []);

    useHostMessages((message) => {
        switch (message.command) {
            case 'new-problem':
                flushSave();
                setProblem(message.problem);
                setResults({});
                setRunningId(null);
                setView({
                    fileStatus: message.fileStatus,
                    mainFilePath: message.mainFilePath,
                    testFilePath: message.testFilePath,
                    recentFiles: message.recentFiles ?? [],
                });
                break;
            case 'compiling-start':
                setCompiling(true);
                setResults({});
                break;
            case 'compiling-stop':
                setCompiling(false);
                break;
            case 'running':
                if (message.srcPath === problemRef.current?.srcPath) {
                    setRunningId(message.id);
                }
                break;
            case 'not-running':
                setRunningId(null);
                break;
            case 'run-single-result':
                if (message.srcPath === problemRef.current?.srcPath) {
                    setResults((prev) => ({ ...prev, [message.result.id]: message.result }));
                }
                break;
            case 'notification':
                notify(message.text, message.type);
                break;
        }
    });

    useEffect(() => {
        host.post({ command: 'get-initial-problem' });
    }, []);

    // 编辑停下 500ms 后自动写回 main_test.go；主进程推来的题目不算脏，打开文件不会回写
    useEffect(() => {
        if (!problem || !dirty.current) {
            return;
        }
        const timer = window.setTimeout(flushSave, SAVE_DEBOUNCE_MS);
        return () => window.clearTimeout(timer);
    }, [problem, flushSave]);

    // 用户点回编辑器（比如去按 Alt+1）时不等防抖，保证主进程读到的文件是最新的
    useEffect(() => {
        window.addEventListener('blur', flushSave);
        return () => window.removeEventListener('blur', flushSave);
    }, [flushSave]);

    const updateProblem = useCallback<ProblemUpdater>((updater) => {
        dirty.current = true;
        setProblem((prev) => (prev ? updater(prev) : prev));
    }, []);

    const runAll = useCallback(() => {
        const current = problemRef.current;
        if (!current) {
            return;
        }
        dirty.current = false;
        setResults({});
        host.post({ command: 'run-all-and-save', problem: current });
    }, []);

    const runOne = useCallback((id: number) => {
        const current = problemRef.current;
        if (!current) {
            return;
        }
        dirty.current = false;
        setResults((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
        setRunningId(id);
        host.post({ command: 'run-single-and-save', problem: current, id });
    }, []);

    const stop = useCallback(() => {
        setRunningId(null);
        setCompiling(false);
        notify('已停止', 'warning');
        host.post({ command: 'kill-running' });
    }, [notify]);

    const openFile = useCallback((filePath: string) => host.post({ command: 'open-file', filePath }), []);
    const createVoid = useCallback(() => host.post({ command: 'create-void' }), []);
    const copySource = useCallback(() => {
        if (problemRef.current) {
            host.post({ command: 'copy-main-go', srcPath: problemRef.current.srcPath });
        }
    }, []);

    return (
        <>
            {toast && (
                <div className={`toast ${toast.type}`}>
                    <i className={`codicon codicon-${TOAST_ICON[toast.type]}`}></i>
                    <span>{toast.text}</span>
                </div>
            )}
            {!view ? (
                <div className="empty-loading">加载中…</div>
            ) : !problem ? (
                <EmptyState view={view} onOpenFile={openFile} onCreateVoid={createVoid} />
            ) : (
                <Judge
                    problem={problem}
                    view={view}
                    results={results}
                    runningId={runningId}
                    compiling={compiling}
                    updateProblem={updateProblem}
                    onRunAll={runAll}
                    onRunOne={runOne}
                    onStop={stop}
                    onOpenFile={openFile}
                    onCreateVoid={createVoid}
                    onCopySource={copySource}
                    notify={notify}
                />
            )}
        </>
    );
}
