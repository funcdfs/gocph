import type { ChangeEvent, RefObject } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import type { DiffLine } from '../diff';

/** 带行号的多行文本框，输入 / 期望输出 / 观察区共用 */
export function Editor({
    value,
    onChange,
    readOnly = false,
    autoFocus = false,
    inputRef,
}: {
    value: string;
    onChange?: (event: ChangeEvent<HTMLTextAreaElement>) => void;
    readOnly?: boolean;
    autoFocus?: boolean;
    inputRef?: RefObject<HTMLTextAreaElement>;
}) {
    const lineCount = Math.max(value.split('\n').length, 1);
    return (
        <div className="editor-box">
            <div className="line-numbers">
                {Array.from({ length: lineCount }, (_, i) => (
                    <span key={i} className="ln">
                        {i + 1}
                    </span>
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
}

/** 失败用例的逐行对比视图 */
export function DiffView({ lines, type }: { lines: DiffLine[]; type: 'expected' | 'received' }) {
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
}
