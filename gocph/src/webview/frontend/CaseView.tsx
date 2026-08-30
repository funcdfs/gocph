import { Case, VSToWebViewMessage } from '../../common/types';
import { useState, createRef, useEffect, useCallback } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import React from 'react';

// 极简线性图标：统一 12px 网格、1.3 描边、圆角端点
const stroke = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.3,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
};

const Icons = {
    chevronDown: (
        <svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 4.75 6 7.75 9 4.75" {...stroke} />
        </svg>
    ),
    play: (
        <svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
            <path d="M4.25 2.6 9.6 6l-5.35 3.4Z" fill="currentColor" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
        </svg>
    ),
    trash: (
        <svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
            <path d="M2.75 3.5h6.5M4.75 3.5v-1h2.5v1M3.75 3.5l.4 6h3.7l.4-6" {...stroke} />
        </svg>
    ),
    copy: (
        <svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
            <rect x="4.25" y="4.25" width="5.5" height="6" rx="1.2" {...stroke} />
            <path d="M7.75 4.25v-1a1.2 1.2 0 0 0-1.2-1.2H3.45a1.2 1.2 0 0 0-1.2 1.2v3.6a1.2 1.2 0 0 0 1.2 1.2h.8" {...stroke} />
        </svg>
    ),
    setExpected: (
        <svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
            <path d="M9.5 6h-7M5 3.5 2.5 6 5 8.5" {...stroke} />
        </svg>
    ),
    expand: (
        <svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 4.5v-1.3c0-.66.54-1.2 1.2-1.2h1.3M7.5 2h1.3c.66 0 1.2.54 1.2 1.2v1.3M10 7.5v1.3c0 .66-.54 1.2-1.2 1.2H7.5M4.5 10H3.2A1.2 1.2 0 0 1 2 8.8V7.5" {...stroke} />
        </svg>
    ),
    clear: (
        <svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
            <path d="M3.5 3.5l5 5M8.5 3.5l-5 5" {...stroke} />
        </svg>
    ),
};

// 计算行级别 diff - 与命令行 testutil 保持一致的颜色逻辑
// Got 错误 → 红色, Expect 提示 → 蓝色, 匹配 → 绿色
const computeLineDiff = (expected: string, received: string) => {
    const expLines = expected.replace(/\r\n/g, '\n').trim().split('\n');
    const recLines = received.replace(/\r\n/g, '\n').trim().split('\n');
    const maxLen = Math.max(expLines.length, recLines.length);

    const expectedResult: { text: string; isMatch: boolean }[] = [];
    const receivedResult: { text: string; isMatch: boolean }[] = [];

    for (let i = 0; i < maxLen; i++) {
        const expLine = i < expLines.length ? expLines[i] : '';
        const recLine = i < recLines.length ? recLines[i] : '';
        const isMatch = expLine.trim() === recLine.trim();

        if (i < expLines.length) {
            expectedResult.push({ text: expLine, isMatch });
        }
        if (i < recLines.length) {
            receivedResult.push({ text: recLine, isMatch });
        }
    }

    return { expectedLines: expectedResult, receivedLines: receivedResult };
};

// 带行号的编辑器
const Editor = ({
    value,
    onChange,
    readOnly = false,
    autoFocus = false,
    inputRef
}: {
    value: string;
    onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    readOnly?: boolean;
    autoFocus?: boolean;
    inputRef?: React.RefObject<HTMLTextAreaElement>;
}) => {
    const lines = value.split('\n');
    const lineCount = Math.max(lines.length, 1);

    return (
        <div className="editor-box">
            <div className="line-numbers">
                {Array.from({ length: lineCount }, (_, i) => (
                    <span key={i} className="ln">{i + 1}</span>
                ))}
            </div>
            <TextareaAutosize
                className="selectable editor-content"
                onChange={onChange}
                value={value}
                readOnly={readOnly}
                autoFocus={autoFocus}
                ref={inputRef}
            />
        </div>
    );
};

// Diff 显示组件 - 与命令行 testutil 保持一致
// Got(received) 错误行 → 红色, Expect(expected) 提示行 → 蓝色, 匹配行 → 绿色
const DiffView = ({
    lines,
    type
}: {
    lines: { text: string; isMatch: boolean }[];
    type: 'expected' | 'received';
}) => {
    return (
        <div className={`diff-box ${type}`}>
            {lines.map((line, i) => (
                <div key={i} className={`diff-line ${line.isMatch ? 'match' : 'mismatch'}`}>
                    <span className="ln">{i + 1}</span>
                    <span className="content selectable">{line.text || ' '}</span>
                </div>
            ))}
        </div>
    );
};

export default function CaseView(props: {
    num: number;
    case: Case;
    rerun: (id: number, input: string, output: string) => void;
    updateCase: (id: number, input: string, output: string) => void;
    remove: (num: number) => void;
    notify: (text: string) => void;
    doFocus?: boolean;
    forceRunning: boolean;
    forceExpanded?: boolean | null;
}) {
    const { id, result } = props.case;
    const { doFocus, forceRunning, updateCase, rerun: propsRerun, remove, notify, forceExpanded } = props;
    const caseId = props.case.id;

    const [input, setInput] = useState<string>(props.case.testcase.input);
    const [output, setOutput] = useState<string>(props.case.testcase.output);
    const [running, setRunning] = useState<boolean>(false);
    const [minimized, setMinimized] = useState<boolean>(
        props.case.result?.pass === true,
    );
    const [voidContent, setVoidContent] = useState<string>('');
    const [voidLabel, setVoidLabel] = useState<string>('');
    const inputBox = createRef<HTMLTextAreaElement>();

    // 响应全局展开/收起
    useEffect(() => {
        if (forceExpanded === true) {
            setMinimized(false);
        } else if (forceExpanded === false) {
            setMinimized(true);
        }
    }, [forceExpanded]);

    useEffect(() => {
        if (doFocus) {
            inputBox.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [doFocus, inputBox]);

    useEffect(() => {
        updateCase(caseId, input, output);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [input, output, caseId]);

    useEffect(() => {
        if (forceRunning) {
            setRunning(true);
        }
    }, [forceRunning]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
    }, []);

    const handleOutputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setOutput(e.target.value);
    }, []);

    const handleVoidChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setVoidContent(e.target.value);
    }, []);

    const rerun = useCallback(() => {
        setRunning(true);
        propsRerun(id, input, output);
    }, [id, input, output, propsRerun]);

    const toggle = useCallback(() => setMinimized((prev) => !prev), []);

    const copyToClipboard = useCallback((text: string) => {
        navigator.clipboard.writeText(text);
        notify('已复制');
    }, [notify]);

    const handleExpandToVoid = useCallback((content: string, label: string) => {
        setVoidContent(content);
        setVoidLabel(label);
        notify(`已展开 ${label}`);
    }, [notify]);

    useEffect(() => {
        if (props.case.result !== null) {
            setRunning(false);
            setMinimized(props.case.result.pass === true);
        }
    }, [props.case.result]);

    useEffect(() => {
        if (running) setMinimized(true);
    }, [running]);

    useEffect(() => {
        const handler = (event: MessageEvent) => {
            const data: VSToWebViewMessage = event.data;
            if (data.command === 'not-running') {
                setRunning(false);
            }
        };
        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, []);

    // 计算所有需要的值
    let resultText = '';
    const stderror = result?.stderr;
    if (result?.signal) {
        resultText = result.signal;
    } else if (result?.stdout !== undefined) {
        resultText = result.stdout;
    }
    if (!result) {
        resultText = '';
    }

    const passFailText = result ? (result.pass ? 'passed' : 'failed') : '';
    const caseClassName = 'case ' + (running ? 'running' : passFailText);
    const timeText = result?.timeOut ? '超时' : result?.time + 'ms';

    // 计算 diff
    const showDiff = result && !result.pass && resultText;
    const diff = showDiff ? computeLineDiff(output, resultText) : null;

    // 当 stderr 存在时，自动覆盖观察区
    useEffect(() => {
        if (stderror && stderror.length > 0) {
            setVoidContent('');
            setVoidLabel('');
        }
    }, [stderror]);

    // 定义 handleSetExpected - 使用普通函数而不是 useCallback
    const handleSetExpected = () => {
        setOutput(resultText);
        notify('已设为期望');
    };

    return (
        <div className={caseClassName}>
            <div className="case-header">
                <div className="case-title" onClick={toggle}>
                    <span className={`toggle-icon ${minimized ? 'collapsed' : ''}`}>
                        {Icons.chevronDown}
                    </span>
                    <span className="case-label">测试 {props.num}</span>
                    {running && (
                        <span className="status running">
                            <span className="dot"></span>运行中
                        </span>
                    )}
                    {result && !running && (
                        <>
                            <span className={`status ${result.pass ? 'pass' : 'fail'}`}>
                                <span className="dot"></span>{result.pass ? '通过' : '失败'}
                            </span>
                            <span className="time-label">{timeText}</span>
                        </>
                    )}
                </div>
                <div className="case-actions">
                    <button
                        className="icon-btn run"
                        title="运行此样例"
                        onClick={rerun}
                        disabled={running}
                    >
                        {Icons.play}
                    </button>
                    <button
                        className="icon-btn remove"
                        title="删除此样例"
                        onClick={() => remove(id)}
                    >
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
                                <div className="editor-actions">
                                    <button className="mini-btn" onClick={() => handleExpandToVoid(input, '输入')} title="展开到观察区">
                                        {Icons.expand}
                                    </button>
                                    <button className="mini-btn" onClick={() => copyToClipboard(input)} title="复制">
                                        {Icons.copy}
                                    </button>
                                </div>
                            </div>
                            <Editor
                                value={input}
                                onChange={handleInputChange}
                                autoFocus={doFocus}
                                inputRef={inputBox}
                            />
                        </div>

                        <div className="editor-section expected-section">
                            <div className="editor-label">
                                <span className="name">期望输出</span>
                                <div className="editor-actions">
                                    <button className="mini-btn" onClick={() => handleExpandToVoid(output, '期望输出')} title="展开到观察区">
                                        {Icons.expand}
                                    </button>
                                    <button className="mini-btn" onClick={() => copyToClipboard(output)} title="复制">
                                        {Icons.copy}
                                    </button>
                                </div>
                            </div>
                            {diff ? (
                                <DiffView lines={diff.expectedLines} type="expected" />
                            ) : (
                                <Editor value={output} onChange={handleOutputChange} />
                            )}
                        </div>

                        {result && (
                            <div className="editor-section actual-section">
                                <div className="editor-label">
                                    <span className="name">实际输出</span>
                                    <div className="editor-actions persistent">
                                        <button
                                            className="mini-btn accent"
                                            onClick={handleSetExpected}
                                            title="把实际输出设为期望输出"
                                        >
                                            {Icons.setExpected}
                                            <span>设为期望</span>
                                        </button>
                                    </div>
                                    <div className="editor-actions">
                                        <button className="mini-btn" onClick={() => handleExpandToVoid(resultText, '实际输出')} title="展开到观察区">
                                            {Icons.expand}
                                        </button>
                                        <button className="mini-btn" onClick={() => copyToClipboard(resultText)} title="复制">
                                            {Icons.copy}
                                        </button>
                                    </div>
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
                    {stderror && stderror.length > 0 ? (
                        <div className="editor-row-full">
                            <div className="editor-section">
                                <div className="editor-label">
                                    <span className="name">标准错误</span>
                                    <div className="editor-actions">
                                        <button className="mini-btn" onClick={() => copyToClipboard(stderror)} title="复制">
                                            {Icons.copy}
                                        </button>
                                    </div>
                                </div>
                                <Editor value={truncate(stderror)} readOnly />
                            </div>
                        </div>
                    ) : voidContent ? (
                        <div className="editor-row-full">
                            <div className="editor-section void-section">
                                <div className="editor-label">
                                    <span className="name">{voidLabel || '观察区'}</span>
                                    <div className="editor-actions">
                                        <button className="mini-btn" onClick={() => { setVoidContent(''); setVoidLabel(''); }} title="清空">
                                            {Icons.clear}
                                        </button>
                                        <button className="mini-btn" onClick={() => copyToClipboard(voidContent)} title="复制">
                                            {Icons.copy}
                                        </button>
                                    </div>
                                </div>
                                <Editor value={voidContent} onChange={handleVoidChange} />
                            </div>
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
}

const truncate = (text: string): string => {
    if (text.length > 100000) {
        return '[已截断]\n' + text.substring(0, 100000);
    }
    return text;
};
