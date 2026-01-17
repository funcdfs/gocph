import type { ExtensionContext } from 'vscode';

declare global {
    var storedLogs: string;
    var logger: {
        log: (...args: any[]) => void;
        error: (...args: any[]) => void;
        warn: (...args: any[]) => void;
        info: (...args: any[]) => void;
        debug: (...args: any[]) => void;
    };
    var context: ExtensionContext;
}

export { };
