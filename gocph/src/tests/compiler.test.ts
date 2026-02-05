/**
 * 编译器模块测试
 */
import { describe, test, expect } from 'vitest';
import path from 'path';
import { toAsciiFilename } from '../utilsPure';

// 模拟 getBinSaveLocation 函数的逻辑（不导入实际模块以避免 vscode 依赖）
const getBinSaveLocation = (srcPath: string): string => {
    const srcFileName = path.parse(srcPath).name;
    const binFileName = toAsciiFilename(srcFileName) + '.bin';
    const binDir = path.dirname(srcPath);
    return path.join(binDir, binFileName);
};

describe('compiler 模块测试', () => {
    describe('getBinSaveLocation', () => {
        test('应该生成正确的二进制文件路径', () => {
            const srcPath = '/path/to/main.go';
            const binPath = getBinSaveLocation(srcPath);
            
            expect(binPath).toContain('main.bin');
            expect(path.dirname(binPath)).toBe('/path/to');
        });

        test('应该处理包含特殊字符的文件名', () => {
            const srcPath = '/path/to/测试.go';
            const binPath = getBinSaveLocation(srcPath);
            
            // 应该转换为 ASCII 安全的文件名
            expect(binPath).toContain('.bin');
            expect(binPath).toContain('_u');
            expect(path.dirname(binPath)).toBe('/path/to');
        });

        test('应该处理不同的目录结构', () => {
            const srcPath = '/workspace/cf/1800_2000/1992/A/main.go';
            const binPath = getBinSaveLocation(srcPath);
            
            expect(binPath).toContain('main.bin');
            expect(path.dirname(binPath)).toBe('/workspace/cf/1800_2000/1992/A');
        });

        test('应该处理 Windows 路径', () => {
            const srcPath = 'C:\\workspace\\main.go';
            const binPath = getBinSaveLocation(srcPath);
            
            expect(binPath).toContain('main.bin');
        });

        test('应该处理没有扩展名的文件', () => {
            const srcPath = '/path/to/main';
            const binPath = getBinSaveLocation(srcPath);
            
            expect(binPath).toContain('main.bin');
        });

        test('应该处理复杂的文件名', () => {
            const srcPath = '/path/to/A_Strange_Table.go';
            const binPath = getBinSaveLocation(srcPath);
            
            expect(binPath).toContain('A_Strange_Table.bin');
        });
    });
});
