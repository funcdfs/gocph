/**
 * 逐行比较期望输出与实际输出：忽略 CRLF 差异、首尾空行、每行的首尾空白。
 * 与 tool/testutil 的判定口径一致。
 */
export function isOutputCorrect(expected: string, actual: string): boolean {
    const a = normalizeLines(expected);
    const b = normalizeLines(actual);
    return a.length === b.length && a.every((line, i) => line === b[i]);
}

function normalizeLines(text: string): string[] {
    return text
        .replace(/\r\n/g, '\n')
        .trim()
        .split('\n')
        .map((line) => line.trim());
}
