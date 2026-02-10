/**
 * 全局日志记录器模块
 * 在模块加载时初始化 logger，确保其他模块可以使用
 */

export function initializeLogger() {
    globalThis.storedLogs = '';

    function customLogger(
        originalMethod: (...args: unknown[]) => void,
        ...args: unknown[]
    ) {
        originalMethod(...args);

        globalThis.storedLogs += new Date().toISOString() + ' ';
        globalThis.storedLogs +=
            args
                .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : arg))
                .join(' ') + '\n';
    }

    globalThis.logger = {
        log: (...args: unknown[]) => customLogger(console.log, ...args),
        error: (...args: unknown[]) => customLogger(console.error, ...args),
        warn: (...args: unknown[]) => customLogger(console.warn, ...args),
        info: (...args: unknown[]) => customLogger(console.info, ...args),
        debug: (...args: unknown[]) => customLogger(console.debug, ...args),
    };
}

// 初始化 logger
initializeLogger();
