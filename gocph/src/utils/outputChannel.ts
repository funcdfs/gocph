import * as vscode from 'vscode';

const oc = vscode.window.createOutputChannel('GoCPH');

export const ocAppend = (string: string) => {
    oc.append(string);
};

export const ocWrite = (string: string) => {
    oc.clear();
    oc.append(string);
};

export const ocShow = (preserveFocus: boolean = true) => {
    oc.show(preserveFocus);
};

export const ocHide = () => {
    oc.clear();
    oc.hide();
};
