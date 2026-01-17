/**
 * 配置解析测试
 * **验证: 需求 8.3**
 */
import { describe, it, expect } from 'vitest';
import { parseGoArgs, getValidTimeout, getValidGoCommand } from '../utilsPure';

describe('配置解析测试', () => {
    describe('parseGoArgs - 编译参数解析', () => {
        it('应该正确分割空格分隔的参数', () => {
            expect(parseGoArgs('-race -v')).toEqual(['-race', '-v']);
        });

        it('应该过滤掉空字符串', () => {
            expect(parseGoArgs('  -race   -v  ')).toEqual(['-race', '-v']);
        });

        it('应该处理空字符串', () => {
            expect(parseGoArgs('')).toEqual([]);
        });

        it('应该处理 undefined', () => {
            expect(parseGoArgs(undefined)).toEqual([]);
        });

        it('应该处理 null', () => {
            expect(parseGoArgs(null)).toEqual([]);
        });

        it('应该处理单个参数', () => {
            expect(parseGoArgs('-race')).toEqual(['-race']);
        });

        it('应该处理多个连续空格', () => {
            expect(parseGoArgs('-a    -b     -c')).toEqual(['-a', '-b', '-c']);
        });
    });

    describe('getValidTimeout - 超时时间验证', () => {
        it('应该返回有效的超时时间', () => {
            expect(getValidTimeout(5000)).toBe(5000);
        });

        it('应该为 undefined 返回默认值', () => {
            expect(getValidTimeout(undefined)).toBe(3000);
        });

        it('应该为 null 返回默认值', () => {
            expect(getValidTimeout(null)).toBe(3000);
        });

        it('应该为 0 返回默认值', () => {
            expect(getValidTimeout(0)).toBe(3000);
        });

        it('应该为负数返回默认值', () => {
            expect(getValidTimeout(-1000)).toBe(3000);
        });

        it('应该使用自定义默认值', () => {
            expect(getValidTimeout(undefined, 5000)).toBe(5000);
        });
    });

    describe('getValidGoCommand - Go 命令验证', () => {
        it('应该返回有效的命令', () => {
            expect(getValidGoCommand('/usr/local/go/bin/go')).toBe('/usr/local/go/bin/go');
        });

        it('应该为 undefined 返回默认值', () => {
            expect(getValidGoCommand(undefined)).toBe('go');
        });

        it('应该为 null 返回默认值', () => {
            expect(getValidGoCommand(null)).toBe('go');
        });

        it('应该为空字符串返回默认值', () => {
            expect(getValidGoCommand('')).toBe('go');
        });

        it('应该为只有空白的字符串返回默认值', () => {
            expect(getValidGoCommand('   ')).toBe('go');
        });

        it('应该使用自定义默认值', () => {
            expect(getValidGoCommand(undefined, 'go1.21')).toBe('go1.21');
        });
    });
});
