import { describe, expect, it } from 'vitest';
import { isOutputCorrect } from './compare';

describe('isOutputCorrect', () => {
    it('忽略 CRLF、首尾空行与行尾空白', () => {
        expect(isOutputCorrect('1\n2\n', '1 \r\n2\r\n\n')).toBe(true);
        expect(isOutputCorrect('\n\nYES\n', 'YES')).toBe(true);
    });

    it('行数或内容不同即失败', () => {
        expect(isOutputCorrect('1\n2', '1')).toBe(false);
        expect(isOutputCorrect('1\n2', '1\n3')).toBe(false);
        expect(isOutputCorrect('a b', 'a  b')).toBe(false);
    });
});
