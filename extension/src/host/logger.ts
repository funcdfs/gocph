/**
 * 统一日志出口。只写 console（扩展开发宿主的调试控制台可见），不再挂到 globalThis，
 * 因此任何模块都可以直接 import，没有初始化顺序问题。
 */
const PREFIX = '[gocph]';

export const logger = {
    log: (...args: unknown[]): void => console.log(PREFIX, ...args),
    warn: (...args: unknown[]): void => console.warn(PREFIX, ...args),
    error: (...args: unknown[]): void => console.error(PREFIX, ...args),
};
