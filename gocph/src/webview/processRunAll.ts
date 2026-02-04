import { Problem } from '../types';
import { runSingleAndSave } from './processRunSingle';
import { compileFile, getBinSaveLocation } from '../compiler';
import { deleteBinary, resetCancellation, getIsCancellationRequested } from '../executions';
import { getLanguage } from '../utils';
import { getJudgeViewProvider } from '../extension';

/**
 * Run every testcase in a problem one by one. Waits for the first to complete
 * before running next. `runSingleAndSave` takes care of saving.
 **/
export default async (problem: Problem) => {
    globalThis.logger.log('Run all started', problem);
    resetCancellation();
    const didCompile = await compileFile(problem.srcPath);
    if (!didCompile) {
        return;
    }
    for (const testCase of problem.tests) {
        if (getIsCancellationRequested()) {
            globalThis.logger.log('Run all cancelled');
            break;
        }
        getJudgeViewProvider().extensionToJudgeViewMessage({
            command: 'running',
            id: testCase.id,
            problem: problem,
        });
        await runSingleAndSave(problem, testCase.id, true);
    }
    globalThis.logger.log('Run all finished');
    getJudgeViewProvider().extensionToJudgeViewMessage({
        command: 'not-running',
    });
    deleteBinary(
        getLanguage(problem.srcPath),
        getBinSaveLocation(problem.srcPath),
    );
};
