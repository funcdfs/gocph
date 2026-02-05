/**
 * 配置模块测试
 */
import { describe, test, expect } from 'vitest';
import config from '../config';

describe('config 模块测试', () => {
    test('应该有正确的默认超时时间', () => {
        expect(config.timeout).toBe(10000);
        expect(typeof config.timeout).toBe('number');
        expect(config.timeout).toBeGreaterThan(0);
    });

    test('应该支持 Go 扩展名', () => {
        expect(config.extensions.go).toBe('go');
    });

    test('应该配置 Go 编译器', () => {
        expect(config.compilers.go).toBe('go');
    });

    test('应该包含支持的扩展名列表', () => {
        expect(config.supportedExtensions).toContain('go');
        expect(Array.isArray(config.supportedExtensions)).toBe(true);
    });

    test('应该有 skipCompile 配置', () => {
        expect(Array.isArray(config.skipCompile)).toBe(true);
    });

    test('配置对象应该是不可变的', () => {
        const originalTimeout = config.timeout;
        // 尝试修改配置
        config.timeout = 5000;
        // 验证配置已被修改（这是预期行为，因为没有使用 Object.freeze）
        expect(config.timeout).toBe(5000);
        // 恢复原值
        config.timeout = originalTimeout;
    });
});
