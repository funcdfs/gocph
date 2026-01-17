/**
 * 配置参数属性测试
 * **Property 5: 配置参数构建正确性**
 * **验证: 需求 8.3**
 */
import { describe, it } from 'vitest';
import fc from 'fast-check';
import { parseGoArgs, getValidTimeout, getValidGoCommand } from '../utilsPure';

describe('配置参数属性测试', () => {
    /**
     * Property 5.1: parseGoArgs 应该正确按空格分割参数
     */
    it('parseGoArgs 应该正确按空格分割参数', () => {
        fc.assert(
            fc.property(
                fc.array(fc.string().filter(s => !s.includes(' ') && s.length > 0), { minLength: 1, maxLength: 10 }),
                (args) => {
                    const input = args.join(' ');
                    const result = parseGoArgs(input);
                    // 结果应该包含所有非空参数
                    return result.length === args.length && 
                           result.every((r, i) => r === args[i]);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 5.2: parseGoArgs 应该过滤掉空字符串
     */
    it('parseGoArgs 结果不应该包含空字符串', () => {
        fc.assert(
            fc.property(
                fc.string(),
                (input) => {
                    const result = parseGoArgs(input);
                    return result.every(s => s.length > 0);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 5.3: parseGoArgs 应该返回有效的参数数组
     */
    it('parseGoArgs 应该总是返回数组', () => {
        fc.assert(
            fc.property(
                fc.oneof(fc.string(), fc.constant(undefined), fc.constant(null)),
                (input) => {
                    const result = parseGoArgs(input as string | undefined | null);
                    return Array.isArray(result);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 5.4: getValidTimeout 应该总是返回正数
     */
    it('getValidTimeout 应该总是返回正数', () => {
        fc.assert(
            fc.property(
                fc.oneof(
                    fc.integer(),
                    fc.constant(undefined),
                    fc.constant(null),
                    fc.double()
                ),
                (input) => {
                    const result = getValidTimeout(input as number | undefined | null);
                    return result > 0;
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 5.5: getValidGoCommand 应该总是返回非空字符串
     */
    it('getValidGoCommand 应该总是返回非空字符串', () => {
        fc.assert(
            fc.property(
                fc.oneof(fc.string(), fc.constant(undefined), fc.constant(null)),
                (input) => {
                    const result = getValidGoCommand(input as string | undefined | null);
                    return typeof result === 'string' && result.length > 0;
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 5.6: 有效的超时时间应该被保留
     */
    it('有效的超时时间应该被保留', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 1, max: 1000000 }),
                (timeout) => {
                    return getValidTimeout(timeout) === timeout;
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 5.7: 有效的 Go 命令应该被保留
     */
    it('有效的 Go 命令应该被保留', () => {
        fc.assert(
            fc.property(
                fc.string().filter(s => s.trim().length > 0),
                (command) => {
                    return getValidGoCommand(command) === command;
                }
            ),
            { numRuns: 100 }
        );
    });
});
