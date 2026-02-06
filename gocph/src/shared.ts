/**
 * 共享模块 - 用于打破循环依赖
 * 存储全局引用，避免 extension.ts 和 editorChange.ts 之间的循环导入
 */

import type JudgeViewProvider from './webview/JudgeView';

// 全局引用
let judgeViewProviderInstance: JudgeViewProvider | undefined;

export function setJudgeViewProvider(provider: JudgeViewProvider) {
    judgeViewProviderInstance = provider;
}

export function getJudgeViewProvider(): JudgeViewProvider {
    if (!judgeViewProviderInstance) {
        throw new Error('JudgeViewProvider not initialized');
    }
    return judgeViewProviderInstance;
}

// 折叠函数引用
let foldRegionsFunction: (() => Promise<number>) | undefined;
let toggleRegionsFunction: (() => Promise<number>) | undefined;

export function setFoldRegionsFunction(fn: () => Promise<number>) {
    foldRegionsFunction = fn;
}

export function setToggleRegionsFunction(fn: () => Promise<number>) {
    toggleRegionsFunction = fn;
}

export function foldRegionsInActiveEditor(): Promise<number> {
    if (!foldRegionsFunction) {
        throw new Error('Fold regions function not initialized');
    }
    return foldRegionsFunction();
}

export function toggleRegionsInActiveEditor(): Promise<number> {
    if (!toggleRegionsFunction) {
        throw new Error('Toggle regions function not initialized');
    }
    return toggleRegionsFunction();
}
