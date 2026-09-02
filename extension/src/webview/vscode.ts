/**
 * webview 与主进程通信的唯一出口。
 */
import { useEffect, useRef } from 'react';
import type { HostMessage, WebviewMessage, WebviewPersistedState } from '../shared/protocol';

interface VsCodeApi {
    postMessage(message: WebviewMessage): void;
    getState(): WebviewPersistedState | undefined;
    setState(state: WebviewPersistedState): void;
}

declare function acquireVsCodeApi(): VsCodeApi;

const api = acquireVsCodeApi();

export const host = {
    post(message: WebviewMessage): void {
        api.postMessage(message);
    },
    /** 面板隐藏再显示、甚至重启 VS Code 后仍然保留的 UI 偏好 */
    getState(): WebviewPersistedState {
        return api.getState() ?? {};
    },
    patchState(patch: Partial<WebviewPersistedState>): void {
        api.setState({ ...host.getState(), ...patch });
    },
};

/** 订阅主进程消息。只挂一个 window 监听器，handler 每次渲染都可以换 */
export function useHostMessages(handler: (message: HostMessage) => void): void {
    const latest = useRef(handler);
    latest.current = handler;

    useEffect(() => {
        const listener = (event: MessageEvent<HostMessage>): void => latest.current(event.data);
        window.addEventListener('message', listener);
        return () => window.removeEventListener('message', listener);
    }, []);
}
