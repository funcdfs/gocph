import * as fs from 'fs';
import type { Memento } from 'vscode';
import type { RecentFile } from '../../shared/problem';

const KEY = 'gocph.recentFiles';
const MAX_ENTRIES = 10;

/** 最近打开过的题目 main.go，存在 globalState 里，跨窗口共享；空状态页用它做快捷入口 */
export class RecentFiles {
    constructor(private readonly state: Memento) {}

    /** 置顶 filePath，超出上限的旧记录丢弃 */
    touch(filePath: string): void {
        const rest = this.paths().filter((p) => p !== filePath);
        void this.state.update(KEY, [filePath, ...rest].slice(0, MAX_ENTRIES));
    }

    /** 已不存在的文件会被跳过 */
    list(): RecentFile[] {
        return this.paths().flatMap((filePath) => {
            try {
                return [{ path: filePath, modifiedTime: fs.statSync(filePath).mtimeMs }];
            } catch {
                return [];
            }
        });
    }

    private paths(): string[] {
        return this.state.get<string[]>(KEY, []);
    }
}
