/**
 * 工具函数测试
 * **验证: 需求 4.1**
 */
globalThis.logger = { ...console };
import { describe, test, expect } from 'vitest';
import { words_in_text, toAsciiFilename, parseGoArgs, getValidTimeout, getValidGoCommand } from '../utilsPure';

describe('words_in_text - 文本分词', () => {
    test('混合拉丁字母、非拉丁字母和数字', () => {
        const output = ['apple', '12345', 'mango', 'India', 'こんにちは', '7'];
        const input = 'apple 12345 mango India こんにちは 7';
        expect(words_in_text(input)).toEqual(output);
    });

    test('只有数字', () => {
        const output = ['23'];
        const input = '23';
        expect(words_in_text(input)).toEqual(output);
    });

    test('只有单词', () => {
        const output = ['grapes'];
        const input = 'grapes';
        expect(words_in_text(input)).toEqual(output);
    });

    test('空字符串', () => {
        expect(words_in_text('')).toBeNull();
    });

    test('只有特殊字符', () => {
        expect(words_in_text('!@#$%^&*()')).toBeNull();
    });
});

describe('toAsciiFilename - ASCII 文件名转换', () => {
    test('纯 ASCII 字符串保持不变', () => {
        expect(toAsciiFilename('hello_world')).toBe('hello_world');
    });

    test('中文字符被转换为 Unicode 编码', () => {
        const result = toAsciiFilename('测试');
        expect(result).toContain('_u');
        expect(result).not.toContain('测');
        expect(result).not.toContain('试');
    });

    test('混合字符串正确转换', () => {
        const result = toAsciiFilename('test测试');
        expect(result.startsWith('test')).toBe(true);
        expect(result).toContain('_u');
    });

    test('空字符串返回空字符串', () => {
        expect(toAsciiFilename('')).toBe('');
    });

    test('日文字符被转换', () => {
        const result = toAsciiFilename('こんにちは');
        expect(result).toContain('_u');
        expect(result).not.toContain('こ');
    });

    test('数字保持不变', () => {
        expect(toAsciiFilename('123')).toBe('123');
    });

    test('特殊 ASCII 字符保持不变', () => {
        expect(toAsciiFilename('file-name_v1.0')).toBe('file-name_v1.0');
    });
});

describe('parseGoArgs - 编译参数解析', () => {
    test('正常参数分割', () => {
        expect(parseGoArgs('-race -v')).toEqual(['-race', '-v']);
    });

    test('空字符串返回空数组', () => {
        expect(parseGoArgs('')).toEqual([]);
    });

    test('undefined 返回空数组', () => {
        expect(parseGoArgs(undefined)).toEqual([]);
    });

    test('null 返回空数组', () => {
        expect(parseGoArgs(null)).toEqual([]);
    });
});

describe('getValidTimeout - 超时时间验证', () => {
    test('有效超时时间被保留', () => {
        expect(getValidTimeout(5000)).toBe(5000);
    });

    test('无效值返回默认值', () => {
        expect(getValidTimeout(undefined)).toBe(3000);
        expect(getValidTimeout(null)).toBe(3000);
        expect(getValidTimeout(0)).toBe(3000);
        expect(getValidTimeout(-1)).toBe(3000);
    });
});

describe('getValidGoCommand - Go 命令验证', () => {
    test('有效命令被保留', () => {
        expect(getValidGoCommand('go1.21')).toBe('go1.21');
    });

    test('无效值返回默认值', () => {
        expect(getValidGoCommand(undefined)).toBe('go');
        expect(getValidGoCommand(null)).toBe('go');
        expect(getValidGoCommand('')).toBe('go');
    });
});
