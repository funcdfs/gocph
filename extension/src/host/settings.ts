import * as vscode from 'vscode';

/** 键名与 package.json 的 contributes.configuration 保持一致 */
type SettingKey =
    | '超时时间'
    | '编译成功时隐藏警告'
    | '忽略标准错误'
    | '编译参数'
    | 'Go命令'
    | '自动显示结果面板'
    | 'Companion端口'
    | '自动折叠骨架';

function read<T>(key: SettingKey, fallback: T): T {
    const value = vscode.workspace.getConfiguration('gocph').get<T>(key);
    return value === undefined || value === null ? fallback : value;
}

/** 用户设置的类型化读取；每次调用都读最新值，不做缓存 */
export const settings = {
    timeoutMs: (): number => {
        const value = read<number>('超时时间', 10000);
        return value > 0 ? value : 10000;
    },
    hideStderrWhenCompiledOk: (): boolean => read('编译成功时隐藏警告', true),
    ignoreStderr: (): boolean => read('忽略标准错误', false),
    goArgs: (): string[] => read('编译参数', '').split(' ').filter(Boolean),
    goCommand: (): string => read('Go命令', 'go').trim() || 'go',
    autoShowPanel: (): boolean => read('自动显示结果面板', true),
    companionPort: (): number => read('Companion端口', 27121),
    autoFold: (): boolean => read('自动折叠骨架', true),
};
