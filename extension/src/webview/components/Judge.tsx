import { useCallback, useEffect, useRef, useState } from 'react';
import type { Problem, TestCase } from '../../shared/problem';
import type { NotificationType } from '../../shared/protocol';
import { fireConfetti } from '../confetti';
import { fileName } from '../format';
import type { ExpandCommand, ProblemUpdater, Results, ViewState } from '../state';
import { CaseView } from './CaseView';
import { Whiteboard } from './Whiteboard';

interface Props {
    problem: Problem;
    view: ViewState;
    results: Results;
    runningId: number | null;
    compiling: boolean;
    updateProblem: ProblemUpdater;
    onRunAll(): void;
    onRunOne(id: number): void;
    onStop(): void;
    onOpenFile(filePath: string): void;
    onCreateVoid(): void;
    onCopySource(): void;
    notify(text: string, type?: NotificationType): void;
}

/** 有题目时的主界面：顶栏、用例列表、白板 */
export function Judge(props: Props) {
    const { problem, view, results, runningId, compiling, updateProblem, notify } = props;
    const { onRunAll, onRunOne, onStop, onOpenFile, onCreateVoid, onCopySource } = props;
    const { mainFilePath, testFilePath } = view;

    const total = problem.tests.length;
    const passed = problem.tests.filter((t) => results[t.id]?.pass).length;
    const isRunning = compiling || runningId !== null;
    const hasTimeout = problem.tests.some((t) => results[t.id]?.timeOut || results[t.id]?.signal === 'SIGTERM');

    // 一轮运行结束且全部通过时放烟花；wasRunning 保证只在「跑完」那一刻触发一次
    const wasRunning = useRef(false);
    useEffect(() => {
        if (wasRunning.current && !isRunning && total > 0 && passed === total) {
            fireConfetti();
        }
        wasRunning.current = isRunning;
    }, [isRunning, passed, total]);

    const [autoFocusId, setAutoFocusId] = useState<number | null>(null);
    const [expandCommand, setExpandCommand] = useState<ExpandCommand | null>(null);

    const addCase = useCallback(() => {
        const id = Date.now();
        updateProblem((p) => ({ ...p, tests: [...p.tests, { id, input: '', output: '' }] }));
        setAutoFocusId(id);
    }, [updateProblem]);

    const updateCase = useCallback(
        (id: number, patch: Partial<Pick<TestCase, 'input' | 'output'>>) => {
            updateProblem((p) => ({ ...p, tests: p.tests.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
        },
        [updateProblem],
    );

    const removeCase = useCallback(
        (id: number) => updateProblem((p) => ({ ...p, tests: p.tests.filter((t) => t.id !== id) })),
        [updateProblem],
    );

    const setWhiteboard = useCallback(
        (whiteboard: string) => updateProblem((p) => ({ ...p, whiteboard })),
        [updateProblem],
    );

    const setAllExpanded = (expanded: boolean): void => setExpandCommand({ expanded, seq: Date.now() });

    return (
        <div className="ui">
            <div className="topbar">
                {/* 第一行：文件入口 + 题目名 + 代码操作 */}
                <div className="topbar-row">
                    {mainFilePath && (
                        <button
                            className="icon-btn"
                            onClick={() => onOpenFile(mainFilePath)}
                            title={`打开 ${fileName(mainFilePath)}`}
                        >
                            <i className="codicon codicon-go-to-file"></i>
                        </button>
                    )}
                    {testFilePath && (
                        <button
                            className="icon-btn"
                            onClick={() => onOpenFile(testFilePath)}
                            title={`打开 ${fileName(testFilePath)}`}
                        >
                            <i className="codicon codicon-beaker"></i>
                        </button>
                    )}
                    <span className="problem-name" title={problem.name}>
                        {problem.name}
                    </span>
                    {compiling && <span className="spinner"></span>}
                    <button className="btn" onClick={onCopySource} title="复制代码 (Alt+3)">
                        <i className="codicon codicon-copy"></i> 复制
                    </button>
                    <button className="icon-btn" onClick={onCreateVoid} title="新建 void 文件">
                        <i className="codicon codicon-add"></i>
                    </button>
                </div>

                {/* 第二行：运行 / 停止 / 通过率 */}
                <div className="topbar-row actions">
                    <button className="btn primary run" onClick={onRunAll} title="全部运行 (Alt+1)">
                        <i className="codicon codicon-run-all"></i> 全部运行
                    </button>
                    <button className="icon-btn stop" onClick={onStop} title="停止运行 (Alt+2)" disabled={!isRunning}>
                        <i className="codicon codicon-debug-stop"></i>
                    </button>
                    <span className={`pass-rate ${passed === total && total > 0 ? 'all-pass' : ''}`}>
                        <b>{passed}</b> / {total}
                    </span>
                </div>
            </div>

            <div className="list-toolbar">
                <button className="btn" onClick={addCase}>
                    <i className="codicon codicon-add"></i> 添加样例
                </button>
                <div className="spacer"></div>
                <button className="icon-btn" onClick={() => setAllExpanded(false)} title="全部收起">
                    <i className="codicon codicon-chevron-up"></i>
                </button>
                <button className="icon-btn" onClick={() => setAllExpanded(true)} title="全部展开">
                    <i className="codicon codicon-chevron-down"></i>
                </button>
            </div>

            <div className="case-list">
                {problem.tests.map((test, i) => (
                    <CaseView
                        key={test.id}
                        index={i + 1}
                        test={test}
                        result={results[test.id] ?? null}
                        running={runningId === test.id}
                        autoFocus={autoFocusId === test.id}
                        expandCommand={expandCommand}
                        onChange={updateCase}
                        onRun={onRunOne}
                        onRemove={removeCase}
                        notify={notify}
                    />
                ))}
            </div>

            {hasTimeout && (
                <div className="hint">
                    <div className="hint-title">
                        <i className="codicon codicon-warning"></i> 超时或 SIGTERM
                    </div>
                    <p>检查是否正确读入了全部数据。</p>
                </div>
            )}

            <Whiteboard value={problem.whiteboard} onChange={setWhiteboard} />
        </div>
    );
}
