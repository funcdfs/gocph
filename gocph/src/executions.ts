import { Language, Run } from './types';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import config from './config';
import { getTimeOutPref } from './preferences';
import * as vscode from 'vscode';

const runningBinaries: ChildProcessWithoutNullStreams[] = [];
let isCancellationRequested = false;

export const resetCancellation = () => {
    isCancellationRequested = false;
};

export const requestCancellation = () => {
    isCancellationRequested = true;
    killRunning();
};

export const getIsCancellationRequested = () => isCancellationRequested;

/**
 * Run a single testcase, and return the raw results, without judging.
 *
 * @param binPath path to the executable binary
 * @param input string to be piped into the stdin of the spawned process
 */
export const runTestCase = (
    language: Language,
    binPath: string,
    input: string,
): Promise<Run> => {
    globalThis.logger.log('Running testcase', language, binPath, input);
    const result: Run = {
        stdout: '',
        stderr: '',
        code: null,
        signal: null,
        time: 0,
        timeOut: false,
    };
    const spawnOpts = {
        timeout: config.timeout,
        env: {
            ...global.process.env,
            DEBUG: 'true',
        },
    };

    // Go binary execution
    const process: ChildProcessWithoutNullStreams = spawn(binPath, spawnOpts);

    const killer = setTimeout(() => {
        result.timeOut = true;
        process.kill();
    }, getTimeOutPref());

    process.on('error', (err) => {
        globalThis.logger.error(err);
        vscode.window.showErrorMessage(
            `Could not launch testcase process. Is Go installed?`,
        );
    });

    const begin = Date.now();
    const ret: Promise<Run> = new Promise((resolve) => {
        runningBinaries.push(process);
        process.on('exit', (code, signal) => {
            const end = Date.now();
            clearTimeout(killer);
            result.code = code;
            result.signal = signal;
            result.time = end - begin;
            runningBinaries.pop();
            globalThis.logger.log('Run Result:', result);
            resolve(result);
        });

        process.stdout.on('data', (data) => {
            result.stdout += data;
        });
        process.stderr.on('data', (data) => (result.stderr += data));

        globalThis.logger.log('Wrote to STDIN');
        try {
            process.stdin.write(input);
        } catch (err) {
            globalThis.logger.error('WRITEERROR', err);
        }

        process.stdin.end();
        process.on('error', (err) => {
            const end = Date.now();
            clearTimeout(killer);
            result.code = 1;
            result.signal = err.name;
            result.time = end - begin;
            runningBinaries.pop();
            globalThis.logger.log('Run Error Result:', result);
            resolve(result);
        });
    });

    return ret;
};

/** Remove the generated binary from the file system, if present */
export const deleteBinary = (_language: Language, binPath: string) => {
    globalThis.logger.log('Deleting binary', binPath);
    try {
        spawn('rm', [binPath]);
    } catch (err) {
        globalThis.logger.error('Error while deleting binary', err);
    }
};

/** Kill all running binaries. Usually, only one should be running at a time. */
export const killRunning = () => {
    globalThis.logger.log('Killing binaries');
    runningBinaries.forEach((process) => process.kill());
};
