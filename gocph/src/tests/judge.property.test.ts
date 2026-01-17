/**
 * 判题逻辑属性测试
 * **Property 3: 判题逻辑正确性**
 * **验证: 需求 6.3**
 */
globalThis.logger = { ...console };
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { isResultCorrect } from '../judge';

describe('判题逻辑属性测试', () => {
    /**
     * Property 3.1: 判题结果的确定性
     * 对于任意测试用例的期望输出和实际输出，判题结果应该是确定性的
     * （相同输入总是产生相同结果）
     */
    it('判题结果应该是确定性的', () => {
        fc.assert(
            fc.property(
                fc.string(),
                fc.string(),
                (expected, actual) => {
                    const testCase = { input: '', output: expected, id: 1 };
                    const result1 = isResultCorrect(testCase, actual);
                    const result2 = isResultCorrect(testCase, actual);
                    return result1 === result2;
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 3.2: 完全相同的输出应该通过
     * 如果期望输出和实际输出完全相同，则判定为通过
     */
    it('完全相同的输出应该通过', () => {
        fc.assert(
            fc.property(
                fc.string().filter(s => s.trim().length > 0),
                (output) => {
                    const testCase = { input: '', output, id: 1 };
                    return isResultCorrect(testCase, output) === true;
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 3.3: 行尾空白应该被忽略
     * 在忽略行尾空白后相等的输出应该判定为通过
     */
    it('行尾空白应该被忽略', () => {
        fc.assert(
            fc.property(
                fc.array(fc.string().filter(s => !s.includes('\n') && !s.includes('\r')), { minLength: 1, maxLength: 5 }),
                fc.array(fc.string({ maxLength: 5 }).filter(s => /^\s*$/.test(s)), { minLength: 1, maxLength: 5 }),
                (lines, trailingSpaces) => {
                    // 创建带有行尾空白的输出
                    const withSpaces = lines.map((line, i) => 
                        line + (trailingSpaces[i % trailingSpaces.length] || '')
                    ).join('\n');
                    const withoutSpaces = lines.join('\n');
                    
                    const testCase = { input: '', output: withoutSpaces, id: 1 };
                    return isResultCorrect(testCase, withSpaces) === true;
                }
            ),
            { numRuns: 50 }
        );
    });

    /**
     * Property 3.4: CRLF 和 LF 换行符应该等价
     */
    it('CRLF 和 LF 换行符应该等价', () => {
        fc.assert(
            fc.property(
                fc.array(fc.string().filter(s => !s.includes('\n') && !s.includes('\r')), { minLength: 1, maxLength: 5 }),
                (lines) => {
                    const withLF = lines.join('\n');
                    const withCRLF = lines.join('\r\n');
                    
                    const testCase = { input: '', output: withLF, id: 1 };
                    return isResultCorrect(testCase, withCRLF) === true;
                }
            ),
            { numRuns: 50 }
        );
    });

    /**
     * Property 3.5: 空输出应该匹配空期望
     */
    it('空输出应该匹配空期望', () => {
        const testCase = { input: '', output: '', id: 1 };
        expect(isResultCorrect(testCase, '')).toBe(true);
        expect(isResultCorrect(testCase, '   ')).toBe(true);
        expect(isResultCorrect(testCase, '\n\n')).toBe(true);
    });
});
