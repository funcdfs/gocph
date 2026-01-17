import { Problem } from './types';
import { 
    getTestFilePath, 
    getProblemFromTestFile, 
    saveProblemToTestFile 
} from './testFileParser';

/**
 * 获取 test 文件路径（兼容旧 API）
 */
export const getProbSaveLocation = (srcPath: string): string => {
    return getTestFilePath(srcPath);
};

/** 获取源文件对应的问题，如果不存在则返回 null */
export const getProblem = (srcPath: string): Problem | null => {
    return getProblemFromTestFile(srcPath);
};

/** 保存问题到 test 文件 */
export const saveProblem = (srcPath: string, problem: Problem) => {
    saveProblemToTestFile(srcPath, problem);
};
