/**
 * 行级 diff，与 tool/testutil 的命令行输出口径一致：
 * 实际输出的错误行标红，期望输出的对应行标蓝，匹配行标绿（颜色由 CSS 决定）。
 */
export interface DiffLine {
    text: string;
    isMatch: boolean;
}

export interface LineDiff {
    expectedLines: DiffLine[];
    receivedLines: DiffLine[];
}

export function computeLineDiff(expected: string, received: string): LineDiff {
    const expLines = expected.replace(/\r\n/g, '\n').trim().split('\n');
    const recLines = received.replace(/\r\n/g, '\n').trim().split('\n');
    const rows = Math.max(expLines.length, recLines.length);

    const expectedLines: DiffLine[] = [];
    const receivedLines: DiffLine[] = [];
    for (let i = 0; i < rows; i++) {
        const exp = expLines[i] ?? '';
        const rec = recLines[i] ?? '';
        const isMatch = exp.trim() === rec.trim();
        if (i < expLines.length) {
            expectedLines.push({ text: exp, isMatch });
        }
        if (i < recLines.length) {
            receivedLines.push({ text: rec, isMatch });
        }
    }
    return { expectedLines, receivedLines };
}
