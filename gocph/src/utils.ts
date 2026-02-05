import { spawn } from 'child_process';
import { randomBytes } from 'crypto';
import { existsSync } from 'fs';
import { platform } from 'os';
import path from 'path';
import * as vscode from 'vscode';

import config from './config';
import { getGoArgsPref, getGoCommand } from './preferences';
import { Language, Problem } from './types';
import { getTestFilePath, getProblemFromTestFile, isInAllowedDirectory } from './testFileParser';

const oc = vscode.window.createOutputChannel('GoCPH');

/** 文件状态类型 */
export type FileStatus = 'valid' | 'not-allowed' | 'no-file' | 'is-test-file';

/**
 * 检查是否是测试文件 (xxx_test.go)
 */
export const isTestFile = (srcPath: string): boolean => {
    return srcPath.endsWith('_test.go');
};

/**
 * 获取测试文件对应的主文件路径
 * main_test.go -> main.go
 */
export const getMainFileFromTestFile = (testPath: string): string => {
    return testPath.replace(/_test\.go$/, '.go');
};

/**
 * 获取文档的文件状态
 */
export const getFileStatus = (
    document: vscode.TextDocument | undefined,
): FileStatus => {
    if (document === undefined) {
        return 'no-file';
    }

    const srcPath = document.fileName;

    // 检查是否是 .go 文件
    if (!srcPath.endsWith('.go')) {
        return 'not-allowed';
    }

    // 检查是否在允许的目录下
    if (!isInAllowedDirectory(srcPath)) {
        return 'not-allowed';
    }

    // 检查是否是测试文件
    if (isTestFile(srcPath)) {
        return 'is-test-file';
    }

    return 'valid';
};

/**
 * 生成用于 Content Security Policy 的随机 nonce
 * @returns 32 字符的随机十六进制字符串
 */
export const getNonce = (): string => {
    return randomBytes(16).toString('hex');
};

/**
 * 获取语言配置
 */
export const getLanguage = (srcPath: string): Language => {
    const extension = path.extname(srcPath).split('.').pop();

    if (extension !== 'go') {
        throw new Error('仅支持 Go 文件');
    }

    return {
        name: 'go',
        args: [...getGoArgsPref()],
        compiler: getGoCommand(),
        skipCompile: false,
    };
};

export const isValidLanguage = (srcPath: string): boolean => {
    return config.supportedExtensions.includes(
        path.extname(srcPath).split('.')[1],
    );
};

export const ocAppend = (string: string) => {
    oc.append(string);
};

export const ocWrite = (string: string) => {
    oc.clear();
    oc.append(string);
};

export const ocShow = (preserveFocus: boolean = true) => {
    oc.show(preserveFocus);
};

export const ocHide = () => {
    oc.clear();
    oc.hide();
};

export const randomId = (index: number | null) => {
    if (index !== null) {
        return Math.floor(Date.now() + index);
    } else {
        return Math.floor(Date.now() + Math.random() * 100);
    }
};

/**
 * 检查文件是否支持，不支持则显示错误提示
 */
export const checkUnsupported = (srcPath: string): boolean => {
    if (!isValidLanguage(srcPath)) {
        vscode.window.showErrorMessage(
            '不支持的文件类型，仅支持 .go 文件。',
        );
        return true;
    }
    return false;
};

/** 删除源文件对应的 test 文件 */
export const deleteProblemFile = async (srcPath: string) => {
    const testPath = getTestFilePath(srcPath);

    globalThis.logger.log('删除 test 文件', testPath);
    try {
        if (platform() === 'win32') {
            spawn('cmd.exe', ['/c', 'del', testPath]);
        } else {
            spawn('rm', [testPath]);
        }
    } catch (error) {
        globalThis.logger.error('删除 test 文件时出错', error);
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
};

export const getProblemForDocument = (
    document: vscode.TextDocument | undefined,
): Problem | undefined => {
    if (document === undefined) {
        return undefined;
    }

    const srcPath = document.fileName;

    // 检查是否在允许的目录下
    if (!isInAllowedDirectory(srcPath)) {
        return undefined;
    }

    const testPath = getTestFilePath(srcPath);
    if (!existsSync(testPath)) {
        return undefined;
    }
    return getProblemFromTestFile(srcPath) ?? undefined;
};

/**
 * 格式化时间为本地时间字符串
 * 格式: YYYY-MM-DD HH:mm:ss
 * 与 gen.go 的 time.Now().Format("2006-01-02 15:04:05") 一致
 * 
 * 注意: 不使用 toISOString()，它返回 UTC 时间
 * 
 * @param date 可选的 Date 对象，默认为当前时间
 * @returns 格式化的本地时间字符串，如 "2025-01-20 22:50:47"
 */
export const formatLocalTime = (date?: Date): string => {
    const d = date ?? new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

/**
 * 防抖函数
 * @param func 需要防抖的函数
 * @param wait 等待时间（毫秒）
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;
    return (...args: Parameters<T>) => {
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => {
            func(...args);
        }, wait);
    };
}
