import { getLanguage, ocHide, ocShow, ocWrite } from './utils';
import { Language } from './types';
import { spawn, SpawnOptionsWithoutStdio } from 'child_process';
import path from 'path';
import { getHideStderrorWhenCompiledOK } from './preferences';
import * as vscode from 'vscode';
import { getJudgeViewProvider } from './extension';
import { toAsciiFilename } from './utilsPure';

/**
 * 获取编译后二进制文件的保存位置，始终保存在源文件同目录
 */
export const getBinSaveLocation = (srcPath: string): string => {
    const srcFileName = path.parse(srcPath).name;
    const binFileName = toAsciiFilename(srcFileName) + '.bin';
    const binDir = path.dirname(srcPath);
    return path.join(binDir, binFileName);
};

/**
 * 获取编译参数
 */
const getFlags = (language: Language, srcPath: string): string[] => {
    let args = language.args;
    if (args.length === 1 && args[0] === '') args = [];

    return [
        'build',
        '-o',
        getBinSaveLocation(srcPath),
        srcPath,
        ...args,
    ];
};

/**
 * 编译源文件，编译成功返回 true，失败返回 false
 */
export const compileFile = async (srcPath: string): Promise<boolean> => {
    globalThis.logger.log('开始编译', srcPath);
    
    try {
        await vscode.workspace.openTextDocument(srcPath).then((doc) => doc.save());
    } catch (err) {
        globalThis.logger.error('保存文件失败', err);
        vscode.window.showErrorMessage('保存文件失败，请手动保存后重试。');
        return false;
    }
    
    ocHide();
    
    let language: Language;
    try {
        language = getLanguage(srcPath);
    } catch (err) {
        globalThis.logger.error('获取语言配置失败', err);
        vscode.window.showErrorMessage('不支持的文件类型，仅支持 .go 文件。');
        return false;
    }

    const spawnOpts: SpawnOptionsWithoutStdio = {
        cwd: undefined,
        env: process.env,
    };

    getJudgeViewProvider().extensionToJudgeViewMessage({
        command: 'compiling-start',
    });
    const flags: string[] = getFlags(language, srcPath);
    globalThis.logger.log('编译参数', flags);

    const result = new Promise<boolean>((resolve) => {
        let compiler;
        try {
            compiler = spawn(language.compiler, flags, spawnOpts);
        } catch (err) {
            globalThis.logger.error('启动编译器失败', err);
            vscode.window.showErrorMessage(
                `无法启动编译器 ${language.compiler}。请确认 Go 已安装。`,
            );
            getJudgeViewProvider().extensionToJudgeViewMessage({
                command: 'compiling-stop',
            });
            getJudgeViewProvider().extensionToJudgeViewMessage({
                command: 'not-running',
            });
            resolve(false);
            return;
        }
        let error = '';

        compiler.stderr.on('data', (data) => {
            error += data;
        });

        compiler.on('error', (err) => {
            globalThis.logger.error('编译器进程错误', err);
            ocWrite(
                '编译错误:\n' +
                err.message +
                `\n\n提示: Go 是否已安装？请检查设置中的 Go 命令配置。`,
            );
            getJudgeViewProvider().extensionToJudgeViewMessage({
                command: 'compiling-stop',
            });
            getJudgeViewProvider().extensionToJudgeViewMessage({
                command: 'not-running',
            });
            ocShow();
            resolve(false);
        });

        compiler.on('exit', (exitcode) => {
            const exitCode = exitcode || 0;
            const hideWarningsWhenCompiledOK = getHideStderrorWhenCompiledOK();

            if (exitCode !== 0) {
                ocWrite(`退出码: ${exitCode} 编译错误:\n` + error);
                ocShow();
                globalThis.logger.error('编译失败', { exitCode, error });
                getJudgeViewProvider().extensionToJudgeViewMessage({
                    command: 'compiling-stop',
                });
                getJudgeViewProvider().extensionToJudgeViewMessage({
                    command: 'not-running',
                });
                resolve(false);
                return;
            }

            if (!hideWarningsWhenCompiledOK && error.trim() !== '') {
                ocWrite(`退出码: ${exitCode} 编译警告:\n` + error);
                ocShow();
            }

            globalThis.logger.log('编译成功', srcPath);
            getJudgeViewProvider().extensionToJudgeViewMessage({
                command: 'compiling-stop',
            });
            resolve(true);
            return;
        });
    });
    return result;
};
