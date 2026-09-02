/**
 * 一次评测：保存 → 编译 → 逐个运行 → 判定 → 推送结果。
 * 这是 judge 目录里唯一知道面板与编辑器存在的模块；compile / run / compare 只返回数据。
 */
import * as vscode from 'vscode';
import type { Problem, RunResult, TestCase } from '../../shared/problem';
import { logger } from '../logger';
import { compileOutput } from '../outputChannel';
import type { JudgePanel } from '../panel/JudgePanel';
import { writeProblem } from '../problem/testFile';
import { settings } from '../settings';
import { binaryPathFor, compile, type CompileResult } from './compile';
import { isOutputCorrect } from './compare';
import { deleteBinary, killRunning, runBinary } from './run';

export class JudgeSession {
    private cancelled = false;

    constructor(private readonly panel: JudgePanel) {}

    /** 全部运行：只编译一次，用例顺序执行，中途可停止 */
    async runAll(problem: Problem): Promise<void> {
        await this.run(problem, problem.tests);
    }

    async runSingle(problem: Problem, id: number): Promise<void> {
        const test = problem.tests.find((t) => t.id === id);
        if (!test) {
            logger.error('用例不存在', id);
            return;
        }
        await this.run(problem, [test]);
    }

    stop(): void {
        this.cancelled = true;
        killRunning();
    }

    private async run(problem: Problem, tests: readonly TestCase[]): Promise<void> {
        this.cancelled = false;
        if (!(await this.prepare(problem))) {
            return;
        }
        const binPath = binaryPathFor(problem.srcPath);
        try {
            for (const test of tests) {
                if (this.cancelled) {
                    logger.log('评测已取消');
                    break;
                }
                await this.judgeOne(problem.srcPath, binPath, test);
            }
        } finally {
            this.panel.post({ command: 'not-running' });
            deleteBinary(binPath);
        }
    }

    /** 保存源文件与用例文件，然后编译；编译失败把错误写进输出面板 */
    private async prepare(problem: Problem): Promise<boolean> {
        try {
            const document = await vscode.workspace.openTextDocument(problem.srcPath);
            await document.save();
            writeProblem(problem);
        } catch (err) {
            logger.error('保存失败', err);
            this.panel.notify('保存文件失败，请手动保存后重试', 'error');
            return false;
        }

        compileOutput.hide();
        this.panel.post({ command: 'compiling-start' });
        const result = await compile(problem.srcPath, {
            goCommand: settings.goCommand(),
            extraArgs: settings.goArgs(),
        });
        this.panel.post({ command: 'compiling-stop' });
        return this.reportCompile(result);
    }

    private reportCompile(result: CompileResult): boolean {
        if (!result.ok) {
            logger.error('编译失败', result);
            compileOutput.show(
                result.spawnError
                    ? `无法启动编译器：${result.spawnError.message}\n\n提示: Go 是否已安装？请检查设置中的 Go命令 配置。`
                    : `退出码: ${result.exitCode} 编译错误:\n${result.stderr}`,
            );
            this.panel.post({ command: 'not-running' });
            return false;
        }
        if (result.stderr.trim() && !settings.hideStderrWhenCompiledOk()) {
            compileOutput.show(`编译警告:\n${result.stderr}`);
        }
        return true;
    }

    private async judgeOne(srcPath: string, binPath: string, test: TestCase): Promise<void> {
        this.panel.post({ command: 'running', srcPath, id: test.id });
        const run = await runBinary(binPath, test.input, settings.timeoutMs());

        const stderrFails = !settings.ignoreStderr() && run.stderr !== '';
        const crashed = (run.code !== null && run.code !== 0) || run.signal !== null || stderrFails;
        const result: RunResult = {
            ...run,
            id: test.id,
            pass: !crashed && isOutputCorrect(test.output, run.stdout),
        };
        logger.log('用例结果', test.id, result.pass, `${result.time}ms`);
        this.panel.post({ command: 'run-single-result', srcPath, result });
    }
}
