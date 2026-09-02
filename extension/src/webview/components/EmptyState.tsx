import { fileName, recentFileLabel, relativeTime } from '../format';
import type { ViewState } from '../state';

interface Props {
    view: ViewState;
    onOpenFile(filePath: string): void;
    onCreateVoid(): void;
}

/** 没有题目可展示时的两种空状态：正在看测试文件 → 引导回 main.go；其他 → 新建 void + 最近列表 */
export function EmptyState({ view, onOpenFile, onCreateVoid }: Props) {
    const mainFilePath = view.mainFilePath;
    if (view.fileStatus === 'is-test-file' && mainFilePath) {
        return (
            <div className="empty">
                <div className="empty-note">
                    <i className="codicon codicon-beaker"></i> 当前是测试文件
                </div>
                <button className="btn primary" onClick={() => onOpenFile(mainFilePath)}>
                    <i className="codicon codicon-go-to-file"></i> 打开 {fileName(mainFilePath)}
                </button>
            </div>
        );
    }

    return (
        <div className="empty">
            <button className="btn primary" onClick={onCreateVoid}>
                <i className="codicon codicon-add"></i> 创建 Void
            </button>

            {view.recentFiles.length > 0 && (
                <div className="recent">
                    <p className="recent-title">最近编辑</p>
                    <div className="recent-list">
                        {view.recentFiles.map((file) => (
                            <div
                                key={file.path}
                                className="recent-item"
                                onClick={() => onOpenFile(file.path)}
                                title={file.path}
                            >
                                <i className="codicon codicon-file-code"></i>
                                <span className="name">{recentFileLabel(file.path)}</span>
                                <span className="time">{relativeTime(file.modifiedTime)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
