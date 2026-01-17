/**
 * 判题逻辑测试
 * **验证: 需求 6.3**
 */
globalThis.logger = { ...console };
import { describe, test, expect } from 'vitest';
import { isResultCorrect } from '../judge';

describe('判题逻辑测试', () => {
    describe('基本功能', () => {
        test('单行有效结果', () => {
            const result = '\n\n  12345 hello  \n';
            const testCase = { input: 'something', output: '\n12345 hello', id: 1 };
            expect(isResultCorrect(testCase, result)).toBeTruthy();
        });

        test('单行无效结果', () => {
            const result = '  12345 hello  ';
            const testCase = {
                input: 'something',
                output: 'something else',
                id: 1,
            };
            expect(isResultCorrect(testCase, result)).toBeFalsy();
        });

        test('多行有效结果', () => {
            const result = 'abc def\nghi jkl \n mno pqr\n\n';
            const testCase = {
                input: 'something',
                output: 'abc def\n ghi jkl\nmno pqr',
                id: 1,
            };
            expect(isResultCorrect(testCase, result)).toBeTruthy();
        });

        test('多行无效结果', () => {
            const result = 'abc def\nghi jkl \n mno pqr\n\n';
            const testCase = {
                input: 'something',
                output: 'abc def\nhello',
                id: 1,
            };
            expect(isResultCorrect(testCase, result)).toBeFalsy();
        });
    });

    describe('边界情况', () => {
        test('空输出匹配空期望', () => {
            const result = '';
            const testCase = { input: '', output: '', id: 1 };
            expect(isResultCorrect(testCase, result)).toBeTruthy();
        });

        test('只有空白字符的输出匹配空期望', () => {
            const result = '   \n\n  ';
            const testCase = { input: '', output: '', id: 1 };
            expect(isResultCorrect(testCase, result)).toBeTruthy();
        });

        test('CRLF 和 LF 换行符应该等价', () => {
            const result = 'line1\r\nline2\r\n';
            const testCase = { input: '', output: 'line1\nline2', id: 1 };
            expect(isResultCorrect(testCase, result)).toBeTruthy();
        });

        test('行尾空白应该被忽略', () => {
            const result = 'hello   \nworld   ';
            const testCase = { input: '', output: 'hello\nworld', id: 1 };
            expect(isResultCorrect(testCase, result)).toBeTruthy();
        });

        test('行数不同应该失败', () => {
            const result = 'line1\nline2\nline3';
            const testCase = { input: '', output: 'line1\nline2', id: 1 };
            expect(isResultCorrect(testCase, result)).toBeFalsy();
        });

        test('完全相同的输出应该通过', () => {
            const result = 'exact match';
            const testCase = { input: '', output: 'exact match', id: 1 };
            expect(isResultCorrect(testCase, result)).toBeTruthy();
        });
    });

    describe('确定性', () => {
        test('相同输入应该产生相同结果', () => {
            const testCase = { input: 'test', output: 'expected', id: 1 };
            const actual = 'expected';
            
            const result1 = isResultCorrect(testCase, actual);
            const result2 = isResultCorrect(testCase, actual);
            
            expect(result1).toBe(result2);
        });
    });
});
