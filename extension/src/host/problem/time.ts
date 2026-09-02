/** 本地时间的两种固定写法。不用 toISOString()，它输出的是 UTC。 */

const pad = (n: number): string => String(n).padStart(2, '0');

function parts(d: Date): [string, string, string, string, string, string] {
    return [
        String(d.getFullYear()),
        pad(d.getMonth() + 1),
        pad(d.getDate()),
        pad(d.getHours()),
        pad(d.getMinutes()),
        pad(d.getSeconds()),
    ];
}

/** 2026-01-20 22:50:47，写在 main.go / main_test.go 头部注释里 */
export function formatLocalTime(d: Date = new Date()): string {
    const [Y, M, D, h, m, s] = parts(d);
    return `${Y}-${M}-${D} ${h}:${m}:${s}`;
}

/** 2026_01_20_22_50_47，用作 void 目录名 */
export function formatDirTimestamp(d: Date = new Date()): string {
    return parts(d).join('_');
}
