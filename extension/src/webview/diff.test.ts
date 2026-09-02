import { describe, expect, it } from 'vitest';
import { computeLineDiff } from './diff';

describe('computeLineDiff', () => {
    it('逐行标记匹配与否，多出的行算不匹配', () => {
        const diff = computeLineDiff('1\n2\n3', '1\nx');
        expect(diff.expectedLines).toEqual([
            { text: '1', isMatch: true },
            { text: '2', isMatch: false },
            { text: '3', isMatch: false },
        ]);
        expect(diff.receivedLines).toEqual([
            { text: '1', isMatch: true },
            { text: 'x', isMatch: false },
        ]);
    });

    it('忽略行尾空白与 CRLF', () => {
        const diff = computeLineDiff('a \r\nb', 'a\nb  ');
        expect(diff.expectedLines.every((l) => l.isMatch)).toBe(true);
        expect(diff.receivedLines.every((l) => l.isMatch)).toBe(true);
    });
});
