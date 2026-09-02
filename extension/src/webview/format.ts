/** 路径与时间的展示格式 */

export function fileName(filePath: string): string {
    return filePath.split(/[/\\]/).pop() || filePath;
}

/** "main.go B_Fireworks"：文件名 + 所在目录，最近列表用 */
export function recentFileLabel(filePath: string): string {
    const parts = filePath.split(/[/\\]/);
    const name = parts.pop() || filePath;
    const dir = parts.pop();
    return dir ? `${name} ${dir}` : name;
}

export function relativeTime(timestamp: number, now: number = Date.now()): string {
    const minutes = Math.floor((now - timestamp) / 60_000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) {
        return `${days}天前`;
    }
    if (hours > 0) {
        return `${hours}小时前`;
    }
    if (minutes > 0) {
        return `${minutes}分钟前`;
    }
    return '刚刚';
}
