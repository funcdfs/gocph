import * as vscode from 'vscode';

/** 「GoCPH」输出面板：只用来展示编译错误 / 警告，每次编译前清空 */
let channel: vscode.OutputChannel | undefined;

function get(): vscode.OutputChannel {
    channel ??= vscode.window.createOutputChannel('GoCPH');
    return channel;
}

export const compileOutput = {
    show(text: string): void {
        const oc = get();
        oc.clear();
        oc.append(text);
        oc.show(true);
    },
    hide(): void {
        if (!channel) {
            return;
        }
        channel.clear();
        channel.hide();
    },
    dispose(): void {
        channel?.dispose();
        channel = undefined;
    },
};
