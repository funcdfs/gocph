import { useState, useEffect, useCallback, useRef } from 'react';

interface GlobalDrawerProps {
    whiteboard?: string;
    onWhiteboardChange?: (content: string) => void;
}

export default function GlobalDrawer({ whiteboard, onWhiteboardChange }: GlobalDrawerProps) {
    const [isExpanded, setIsExpanded] = useState<boolean>(() => {
        const saved = localStorage.getItem('gocph-global-drawer-expanded');
        return saved === 'true';
    });

    const [content, setContent] = useState<string>('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // 当 whiteboard prop 变化时更新内容
    useEffect(() => {
        if (whiteboard !== undefined) {
            setContent(whiteboard);
        }
    }, [whiteboard]);

    // 持久化展开状态
    useEffect(() => {
        localStorage.setItem('gocph-global-drawer-expanded', String(isExpanded));
    }, [isExpanded]);

    // 当内容变化时通知父组件
    useEffect(() => {
        if (onWhiteboardChange && content !== whiteboard) {
            onWhiteboardChange(content);
        }
    }, [content, onWhiteboardChange, whiteboard]);

    const toggleExpanded = useCallback(() => {
        setIsExpanded(prev => !prev);
    }, []);

    const handleCollapseAreaClick = useCallback(() => {
        if (isExpanded) {
            setIsExpanded(false);
        }
    }, [isExpanded]);

    const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setContent(e.target.value);
    }, []);

    const handlePaste = useCallback(async () => {
        try {
            const text = await navigator.clipboard.readText();
            setContent(prev => prev + text);
            textareaRef.current?.focus();
        } catch (err) {
            console.error('粘贴失败:', err);
        }
    }, []);

    const handleClear = useCallback(() => {
        if (confirm('确定要清空白板内容吗？')) {
            setContent('');
            textareaRef.current?.focus();
        }
    }, []);

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(content);
            // 可以添加一个临时提示
        } catch (err) {
            console.error('复制失败:', err);
        }
    }, [content]);

    return (
        <div className={`global-drawer ${isExpanded ? 'expanded' : 'collapsed'}`}>
            {/* 收起区域 - 点击收起抽屉 */}
            <div
                className={`drawer-collapse-area ${isExpanded ? '' : 'hidden'}`}
                onClick={handleCollapseAreaClick}
                title="点击收起"
            />

            {/* 抽屉内容区域 */}
            <div className="drawer-content-area">
                {/* 展开/收起手柄 */}
                <div className="drawer-toggle" onClick={toggleExpanded} title="白板"></div>

                {/* 编辑器区域 */}
                <div className="drawer-editor-wrapper">
                    {/* 操作按钮 */}
                    <div className="drawer-actions">
                        <button className="icon-btn" onClick={handlePaste} title="粘贴">
                            <i className="codicon codicon-clippy"></i>
                        </button>
                        <button className="icon-btn" onClick={handleCopy} title="复制">
                            <i className="codicon codicon-copy"></i>
                        </button>
                        <button className="icon-btn remove" onClick={handleClear} title="清空">
                            <i className="codicon codicon-trash"></i>
                        </button>
                    </div>

                    {/* 编辑器 */}
                    <div className="drawer-editor-container">
                        <textarea
                            ref={textareaRef}
                            className="drawer-editor selectable"
                            value={content}
                            onChange={handleContentChange}
                            placeholder=""
                            spellCheck={false}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
