import { workspace } from 'vscode';
import type { prefSection } from './types';

const getPreference = (section: prefSection): any => {
    const ret = workspace.getConfiguration('gocph').get(section);
    globalThis.logger.log('Read preference for ', section, ret);
    return ret;
};

export const getAutoShowJudgePref = (): boolean =>
    getPreference('自动显示结果面板');

export const getHideStderrorWhenCompiledOK = (): boolean =>
    getPreference('编译成功时隐藏警告');

export const getIgnoreSTDERRORPref = (): boolean =>
    getPreference('忽略标准错误');

export const getTimeOutPref = (): number =>
    getPreference('超时时间') || 3000;

export const getGoArgsPref = (): string[] => {
    const args = getPreference('编译参数');
    return args ? args.split(' ').filter(Boolean) : [];
};

export const getGoCommand = (): string =>
    getPreference('Go命令') || 'go';

export const getRetainWebviewContextPref = (): boolean => false;

export const getCompanionPortPref = (): number =>
    getPreference('Companion端口') || 27121;

export const getAutoFoldPref = (): boolean =>
    getPreference('自动折叠骨架') !== false;
