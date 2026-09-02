import * as vscode from 'vscode';

/** 第一个工作区文件夹的绝对路径；题目目录都相对它生成 */
export function workspaceRoot(): string | undefined {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

/** 在编辑器里打开并显示文件（已打开则直接切换过去） */
export async function showDocument(filePath: string): Promise<vscode.TextEditor> {
    const document = await vscode.workspace.openTextDocument(filePath);
    return vscode.window.showTextDocument(document);
}

/** 读取文件在编辑器中的最新内容（包含未保存的修改） */
export async function readDocumentText(filePath: string): Promise<string> {
    const document = await vscode.workspace.openTextDocument(filePath);
    return document.getText();
}
