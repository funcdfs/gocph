import { useCallback, useEffect, useRef, useState } from 'react';
import { host } from '../vscode';

interface Props {
    value: string;
    onChange(value: string): void;
}

/** 底部抽屉白板，内容随题目一起保存在 main_test.go 末尾的块注释里 */
export function Whiteboard({ value, onChange }: Props) {
    const [expanded, setExpanded] = useState<boolean>(() => host.getState().whiteboardExpanded ?? false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        host.patchState({ whiteboardExpanded: expanded });
    }, [expanded]);

    const toggle = useCallback(() => setExpanded((prev) => !prev), []);
    const collapse = useCallback(() => setExpanded(false), []);

    const paste = useCallback(async () => {
        try {
            const text = await navigator.clipboard.readText();
            onChange(value + text);
            textareaRef.current?.focus();
        } catch (err) {
            console.error('粘贴失败', err);
        }
    }, [value, onChange]);

    const copy = useCallback(() => {
        void navigator.clipboard.writeText(value);
    }, [value]);

    const clear = useCallback(() => {
        if (confirm('确定要清空白板内容吗？')) {
            onChange('');
            textareaRef.current?.focus();
        }
    }, [onChange]);

    return (
        <div className={`global-drawer ${expanded ? 'expanded' : 'collapsed'}`}>
            <div className={`drawer-collapse-area ${expanded ? '' : 'hidden'}`} onClick={collapse} title="点击收起" />

            <div className="drawer-content-area">
                <div className="drawer-toggle" onClick={toggle} title="白板"></div>

                <div className="drawer-editor-wrapper">
                    <div className="drawer-actions">
                        <button className="icon-btn" onClick={paste} title="粘贴">
                            <i className="codicon codicon-clippy"></i>
                        </button>
                        <button className="icon-btn" onClick={copy} title="复制">
                            <i className="codicon codicon-copy"></i>
                        </button>
                        <button className="icon-btn remove" onClick={clear} title="清空">
                            <i className="codicon codicon-trash"></i>
                        </button>
                    </div>

                    <div className="drawer-editor-container">
                        <textarea
                            ref={textareaRef}
                            className="drawer-editor selectable"
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                            spellCheck={false}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
