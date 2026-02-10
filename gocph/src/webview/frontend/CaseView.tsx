import { Case, VSToWebViewMessage } from '../../common/types';
import { useState, createRef, useEffect, useCallback } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import React from 'react';

// 手绘风格 SVG 图标组件
const Icons = {
    // 下拉箭头 - 圆润手绘风格
    chevronDown: (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2.5 4.5C2.5 4.5 4 6.5 6 7.5C8 6.5 9.5 4.5 9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
    // 右箭头 - 圆润手绘风格
    chevronRight: (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4.5 2.5C4.5 2.5 6.5 4 7.5 6C6.5 8 4.5 9.5 4.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
    // 播放按钮 - 圆润三角
    play: (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 3C4 2.6 4.3 2.4 4.6 2.6L11 6.6C11.3 6.8 11.3 7.2 11 7.4L4.6 11.4C4.3 11.6 4 11.4 4 11V3Z" fill="currentColor" stroke="currentColor" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
    // 删除按钮 - 圆润垃圾桶
    trash: (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 4H11M5.5 4V3C5.5 2.4 5.9 2 6.5 2H7.5C8.1 2 8.5 2.4 8.5 3V4M4 4L4.5 11.5C4.5 12.1 5 12.5 5.5 12.5H8.5C9 12.5 9.5 12.1 9.5 11.5L10 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
    // 复制按钮 - 圆润文档
    copy: (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3.5" y="3.5" width="6" height="7" rx="1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M8.5 3.5V2.5C8.5 2 8 1.5 7.5 1.5H3C2.5 1.5 2 2 2 2.5V8C2 8.5 2.5 9 3 9H3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
    // 设为期望 - 向左箭头
    setExpected: (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 6H3M3 6L5.5 3.5M3 6L5.5 8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
    // 全屏 - 圆润扩展图标
    expand: (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1.5 4.5V2.5C1.5 2 2 1.5 2.5 1.5H4.5M7.5 1.5H9.5C10 1.5 10.5 2 10.5 2.5V4.5M10.5 7.5V9.5C10.5 10 10 10.5 9.5 10.5H7.5M4.5 10.5H2.5C2 10.5 1.5 10 1.5 9.5V7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
    // 通过状态 - 圆润勾选
    pass: (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2" />
            <path d="M3.5 6L5.5 8L8.5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
    // 失败状态 - 圆润叉号
    fail: (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2" />
            <path d="M4 4L8 8M8 4L4 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
    // 运行中 - 圆润加载
    running: (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="spin">
            <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2" strokeDasharray="20" strokeDashoffset="5" strokeLinecap="round" />
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
                    <span className="case-label">
                        <span className="case-label-text">测试 {props.num}</span>
                    </span>
                    {running && (
                        <span className="status-label running">
                            {Icons.running}
                            <span>运行中</span>
                        </span>
                    )}
                    {result && !running && (
                        <>
                            <span className={`status-label ${result.pass ? 'pass' : 'fail'}`}>
                                {result.pass ? Icons.pass : Icons.fail}
                                <span>{result.pass ? '通过' : '失败'}</span>
                            </span>
                            <span className="time-label">{timeText}</span>
                        </>
                    )}
                </div>
                <div className="case-actions">
                    <button
                        className="icon-btn run"
                        title="运行"
                        onClick={rerun}
                        disabled={running}
                    >
                        {Icons.play}
                    </button>
                    <button
                        className="icon-btn delete"
                        title="删除"
                        onClick={() => remove(id)}
                    >
                        {Icons.trash}
                    </button>
                </div>
            </div>

            {!minimized && (
                <div className="case-body">
                    {/* 第一行：输入 || 期望输出 || 实际输出 */}
                    <div className="editor-row">
                        {/* 输入区域 - 薰衣草紫色 */}
                        <div className="editor-section input-section">
                            <div className="editor-label">
                                <span>输入</span>
                                <div className="editor-actions">
                                    <button className="action-btn" onClick={() => handleExpandToVoid(input, '输入')} title="展开到观察区">
                                        {Icons.expand}
                                    </button>
                                    <button className="action-btn" onClick={() => copyToClipboard(input)} title="复制">
                                        {Icons.copy}
                                        <span>复制</span>
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
                                <span>期望输出</span>
                                <div className="editor-actions">
                                    <button className="action-btn" onClick={() => handleExpandToVoid(output, '期望输出')} title="展开到观察区">
                                        {Icons.expand}
                                    </button>
                                    <button className="action-btn" onClick={() => copyToClipboard(output)} title="复制">
                                        {Icons.copy}
                                        <span>复制</span>
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
                                    <span>实际输出</span>
                                    <div className="editor-actions">
                                        <button
                                            className="action-btn primary"
                                            onClick={handleSetExpected}
                                            title="设为期望"
                                        >
                                            {Icons.setExpected}
                                            <span>设为期望</span>
                                        </button>
                                        <button className="action-btn" onClick={() => handleExpandToVoid(resultText, '实际输出')} title="展开到观察区">
                                            {Icons.expand}
                                        </button>
                                        <button className="action-btn" onClick={() => copyToClipboard(resultText)} title="复制">
                                            {Icons.copy}
                                            <span>复制</span>
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

                    {/* 第二行：stderr 独占 或 void 独占 */}
                    {stderror && stderror.length > 0 ? (
                        <div className="editor-row-full">
                            <div className="editor-section">
                                <div className="editor-label">
                                    <span>标准错误</span>
                                    <div className="editor-actions">
                                        <button className="action-btn" onClick={() => copyToClipboard(stderror)} title="复制">
                                            {Icons.copy}
                                            <span>复制</span>
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
                                    <span>{voidLabel || '观察区'}</span>
                                    <div className="editor-actions">
                                        <button className="action-btn" onClick={() => { setVoidContent(''); setVoidLabel(''); }} title="清空">
                                            <span>清空</span>
                                        </button>
                                        <button className="action-btn" onClick={() => copyToClipboard(voidContent)} title="复制">
                                            {Icons.copy}
                                            <span>复制</span>
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
