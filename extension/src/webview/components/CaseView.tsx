import { useCallback, useEffect, useRef, useState } from 'react';
import type { RunResult, TestCase } from '../../shared/problem';
import { computeLineDiff } from '../diff';
import type { ExpandCommand } from '../state';
import { DiffView, Editor } from './Editor';
import { Icons } from './Icons';

/** 面板里最多展示这么多字符，防止超长输出卡死渲染 */
const MAX_DISPLAY_CHARS = 100_000;

const truncate = (text: string): string =>
    text.length > MAX_DISPLAY_CHARS ? `[已截断]\n${text.slice(0, MAX_DISPLAY_CHARS)}` : text;

interface Props {
    index: number;
    test: TestCase;
    result: RunResult | null;
    running: boolean;
    /** 刚新建的用例：滚到视野内并聚焦输入框 */
    autoFocus: boolean;
    expandCommand: ExpandCommand | null;
    onChange(id: number, patch: Partial<Pick<TestCase, 'input' | 'output'>>): void;
    onRun(id: number): void;
    onRemove(id: number): void;
    notify(text: string): void;
}

/** 单个用例：受控组件，输入 / 期望输出都来自 props，本地只保留折叠与观察区这些纯 UI 状态 */
export function CaseView(props: Props) {
    const { index, test, result, running, autoFocus, expandCommand, onChange, onRun, onRemove, notify } = props;
    const { id, input, output } = test;

    const [minimized, setMinimized] = useState<boolean>(result?.pass === true);
    /** 观察区：把某一段文本放大到整行查看 */
    const [scratch, setScratch] = useState<{ label: string; text: string } | null>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (expandCommand) {
            setMinimized(!expandCommand.expanded);
        }
    }, [expandCommand]);

    useEffect(() => {
        if (running) {
            setMinimized(true);
        }
    }, [running]);

    // 有结果后：通过的收起，失败的展开
    useEffect(() => {
        if (result) {
            setMinimized(result.pass);
        }
    }, [result]);

    useEffect(() => {
        if (autoFocus) {
            inputRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [autoFocus]);

    const stderr = result?.stderr ?? '';
    useEffect(() => {
        if (stderr) {
            setScratch(null);
        }
    }, [stderr]);

    const copy = useCallback(
        (text: string) => {
            void navigator.clipboard.writeText(text);
            notify('已复制');
        },
        [notify],
    );

    const expandTo = useCallback(
        (label: string, text: string) => {
            setScratch({ label, text });
            notify(`已展开 ${label}`);
        },
        [notify],
    );

    const resultText = result ? (result.signal ?? result.stdout) : '';
    const setExpected = (): void => {
        onChange(id, { output: resultText });
        notify('已设为期望');
    };

    const statusClass = running ? 'running' : result ? (result.pass ? 'passed' : 'failed') : '';
    const timeText = result?.timeOut ? '超时' : `${result?.time ?? 0}ms`;
    const diff = result && !result.pass && resultText ? computeLineDiff(output, resultText) : null;

    const actions = (label: string, text: string) => (
        <div className="editor-actions">
            <button className="mini-btn" onClick={() => expandTo(label, text)} title="展开到观察区">
                {Icons.expand}
            </button>
            <button className="mini-btn" onClick={() => copy(text)} title="复制">
                {Icons.copy}
            </button>
        </div>
    );

    return (
        <div className={`case ${statusClass}`}>
            <div className="case-header">
                <div className="case-title" onClick={() => setMinimized((prev) => !prev)}>
                    <span className={`toggle-icon ${minimized ? 'collapsed' : ''}`}>{Icons.chevronDown}</span>
                    <span className="case-label">测试 {index}</span>
                    {running && (
                        <span className="status running">
                            <span className="dot"></span>运行中
                        </span>
                    )}
                    {result && !running && (
                        <>
                            <span className={`status ${result.pass ? 'pass' : 'fail'}`}>
                                <span className="dot"></span>
                                {result.pass ? '通过' : '失败'}
                            </span>
                            <span className="time-label">{timeText}</span>
                        </>
                    )}
                </div>
                <div className="case-actions">
                    <button className="icon-btn run" title="运行此样例" onClick={() => onRun(id)} disabled={running}>
                        {Icons.play}
                    </button>
                    <button className="icon-btn remove" title="删除此样例" onClick={() => onRemove(id)}>
                        {Icons.trash}
                    </button>
                </div>
            </div>

            {!minimized && (
                <div className="case-body">
                    {/* 输入 / 期望输出 / 实际输出：窄栏自动堆叠 */}
                    <div className="editor-row">
                        <div className="editor-section input-section">
                            <div className="editor-label">
                                <span className="name">输入</span>
                                {actions('输入', input)}
                            </div>
                            <Editor
                                value={input}
                                onChange={(e) => onChange(id, { input: e.target.value })}
                                autoFocus={autoFocus}
                                inputRef={inputRef}
                            />
                        </div>

                        <div className="editor-section expected-section">
                            <div className="editor-label">
                                <span className="name">期望输出</span>
                                {actions('期望输出', output)}
                            </div>
                            {diff ? (
                                <DiffView lines={diff.expectedLines} type="expected" />
                            ) : (
                                <Editor value={output} onChange={(e) => onChange(id, { output: e.target.value })} />
                            )}
                        </div>

                        {result && (
                            <div className="editor-section actual-section">
                                <div className="editor-label">
                                    <span className="name">实际输出</span>
                                    <div className="editor-actions persistent">
                                        <button className="mini-btn accent" onClick={setExpected} title="把实际输出设为期望输出">
                                            {Icons.setExpected}
                                            <span>设为期望</span>
                                        </button>
                                    </div>
                                    {actions('实际输出', resultText)}
                                </div>
                                {diff ? (
                                    <DiffView lines={diff.receivedLines} type="received" />
                                ) : (
                                    <Editor value={truncate(resultText)} readOnly />
                                )}
                            </div>
                        )}
                    </div>

                    {/* 标准错误 或 观察区，占满整行 */}
                    {stderr ? (
                        <div className="editor-row-full">
                            <div className="editor-section">
                                <div className="editor-label">
                                    <span className="name">标准错误</span>
                                    <div className="editor-actions">
                                        <button className="mini-btn" onClick={() => copy(stderr)} title="复制">
                                            {Icons.copy}
                                        </button>
                                    </div>
                                </div>
                                <Editor value={truncate(stderr)} readOnly />
                            </div>
                        </div>
                    ) : scratch ? (
                        <div className="editor-row-full">
                            <div className="editor-section void-section">
                                <div className="editor-label">
                                    <span className="name">{scratch.label || '观察区'}</span>
                                    <div className="editor-actions">
                                        <button className="mini-btn" onClick={() => setScratch(null)} title="清空">
                                            {Icons.clear}
                                        </button>
                                        <button className="mini-btn" onClick={() => copy(scratch.text)} title="复制">
                                            {Icons.copy}
                                        </button>
                                    </div>
                                </div>
                                <Editor
                                    value={scratch.text}
                                    onChange={(e) => setScratch({ label: scratch.label, text: e.target.value })}
                                />
                            </div>
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
}
