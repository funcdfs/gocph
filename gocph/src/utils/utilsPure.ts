// Pure javascript utilities, that don't use VS Code API.
// They can still use VS Code type definitions.

export const words_in_text = function (text: string) {
    const regex = /[\p{L}]+|[0-9]+/gu;
    return text.match(regex);
};

/**
 * Converts a string to an ASCII-safe filename.
 * Non-ASCII characters are replaced with their Unicode code point in hexadecimal format.
 * @param input The input string to convert.
 * @returns An ASCII-safe filename.
 */
export const toAsciiFilename = (input: string): string => {
    return Array.from(input)
        .map((char) => {
            const code = char.charCodeAt(0);
            return code < 128
                ? char
                : `_u${code.toString(16).padStart(4, '0')}`;
        })
        .join('');
};

/**
 * 解析编译参数字符串为参数数组
 * @param argsString 空格分隔的参数字符串
 * @returns 参数数组，过滤掉空字符串
 */
export const parseGoArgs = (argsString: string | undefined | null): string[] => {
    if (!argsString) return [];
    return argsString.split(' ').filter(Boolean);
};

/**
 * 获取超时时间，如果无效则返回默认值
 * @param timeout 超时时间
 * @param defaultTimeout 默认超时时间
 * @returns 有效的超时时间
 */
export const getValidTimeout = (timeout: number | undefined | null, defaultTimeout: number = 3000): number => {
    if (timeout === undefined || timeout === null || timeout <= 0) {
        return defaultTimeout;
    }
    return timeout;
};

/**
 * 获取 Go 命令，如果无效则返回默认值
 * @param command Go 命令
 * @param defaultCommand 默认命令
 * @returns 有效的 Go 命令
 */
export const getValidGoCommand = (command: string | undefined | null, defaultCommand: string = 'go'): string => {
    if (!command || command.trim() === '') {
        return defaultCommand;
    }
    return command;
};
