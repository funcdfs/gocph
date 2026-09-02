/**
 * 在真实 VS Code 里跑的集成测试（由 test/vscode/run.mjs 启动，扩展以开发模式加载）。
 * 只验证一件事：插入模板 snippet 后，`// #region main` 骨架会被自动折叠，且不打断 snippet 会话。
 * 不用 mocha，自己记失败清单，最后统一抛错让 runTests 返回非零。
 */
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(what: string, check: () => boolean | Promise<boolean>, timeoutMs: number): Promise<number> {
    const begin = Date.now();
    while (Date.now() - begin < timeoutMs) {
        if (await check()) {
            return Date.now() - begin;
        }
        await sleep(100);
    }
    throw new Error(`等待超时（${timeoutMs}ms）: ${what}`);
}

/** 与 autoFold.ts 中的判定一致：折叠后某个可见区间恰好在 line 结束 */
function isFolded(editor: vscode.TextEditor, line: number): boolean {
    return line < editor.document.lineCount - 1 && editor.visibleRanges.some((r) => r.end.line === line);
}

async function openGoFile(workspace: string, rel: string, content: string): Promise<vscode.TextEditor> {
    const file = path.join(workspace, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
    const document = await vscode.workspace.openTextDocument(file);
    return vscode.window.showTextDocument(document, { preview: false });
}

export async function run(): Promise<void> {
    const failures: string[] = [];
    const test = async (name: string, fn: () => Promise<void>): Promise<void> => {
        try {
            await fn();
            console.log(`  ✔ ${name}`);
        } catch (err) {
            failures.push(name);
            console.error(`  ✘ ${name}\n    ${err instanceof Error ? err.stack : String(err)}`);
        }
    };

    const workspace = vscode.workspace.workspaceFolders![0].uri.fsPath;
    const extensionRoot = path.resolve(__dirname, '..');
    const snippets = JSON.parse(fs.readFileSync(path.join(extensionRoot, 'snippets', 'go.json'), 'utf-8')) as Record<
        string,
        { body: string[] }
    >;
    const cpBody = snippets.cp.body.join('\n');
    const cpEndregion = snippets.cp.body.findIndex((l) => l.includes('#endregion'));

    const goExt = vscode.extensions.getExtension('golang.go');
    console.log(`\n[suite] VS Code ${vscode.version}, golang.go ${goExt ? '已安装' : '未安装'}`);

    // 打开一个 Go 文件触发 onLanguage:go 激活
    const warmup = await openGoFile(workspace, 'warmup/main.go', 'package main\n\nfunc main() {\n}\n');
    const gocph = vscode.extensions.getExtension('funcdfs.gocph');
    assert.ok(gocph, '扩展 funcdfs.gocph 未加载');
    await gocph.activate();
    console.log(`[suite] gocph 已激活`);

    if (goExt) {
        // 等 gopls 起来：它给函数体提供的折叠范围出现即视为就绪
        const ms = await waitFor(
            'gopls 提供折叠范围',
            async () => {
                const ranges =
                    (await vscode.commands.executeCommand<vscode.FoldingRange[]>(
                        'vscode.executeFoldingRangeProvider',
                        warmup.document.uri,
                    )) ?? [];
                return ranges.some((r) => r.start === 2);
            },
            90_000,
        );
        console.log(`[suite] gopls 就绪，用时 ${ms}ms`);
    }

    await test('region provider 与 gopls 的折叠范围合并，// #region main 处有 Region 类型的范围', async () => {
        const editor = await openGoFile(workspace, 'void/provider/main.go', '// time: x\n\n' + cpBody.replace('$0', '') + '\n');
        const ranges = await waitFor2Ranges(editor.document.uri, (rs) => rs.some((r) => r.start === 2));
        const region = ranges.find((r) => r.start === 2)!;
        assert.strictEqual(region.end, 2 + cpEndregion, '折叠范围应到 // #endregion main 那一行');
        assert.strictEqual(region.kind, vscode.FoldingRangeKind.Region);
        if (goExt) {
            assert.ok(ranges.some((r) => r.start !== 2), 'gopls 的语法折叠范围也应存在（两个 provider 共存）');
        }
    });

    await test('打开一个已经含骨架的文件不会被自动折叠', async () => {
        const editor = await openGoFile(workspace, 'void/existing/main.go', '// time: x\n\n' + cpBody.replace('$0', '') + '\n');
        await sleep(3000);
        assert.strictEqual(isFolded(editor, 2), false);
    });

    await test('插入 cp snippet 后骨架自动折叠，snippet 会话继续有效', async () => {
        const editor = await openGoFile(workspace, 'void/snippet/main.go', '// time: x\n\n\n');
        editor.selection = new vscode.Selection(2, 0, 2, 0);
        // 真实模板正文，把 $0 换成带占位符的形式以验证会话没被折叠打断
        const body = cpBody.replace('$0', '${1:todo}$0');
        await editor.insertSnippet(new vscode.SnippetString(body));
        assert.strictEqual(editor.document.getText(editor.selection), 'todo', '插入后选区应停在 $1 占位符上');

        const ms = await waitFor('第 2 行被折叠', () => isFolded(editor, 2), 15_000);
        console.log(`    折叠用时 ${ms}ms`);
        assert.strictEqual(editor.document.lineAt(2).text, '// #region main');
        assert.strictEqual(editor.document.getText(editor.selection), 'todo', '折叠不应改变选区');

        // 会话仍在：跳到 $0 后选区应变成空且离开占位符
        await vscode.commands.executeCommand('jumpToNextSnippetPlaceholder');
        await sleep(200);
        assert.ok(editor.selection.isEmpty, 'jumpToNextSnippetPlaceholder 后选区应为空（到达 $0）');
        assert.notStrictEqual(editor.document.getText(editor.selection), 'todo');
        // 骨架保持折叠
        assert.strictEqual(isFolded(editor, 2), true, '跳转 tabstop 后骨架应仍处于折叠状态');
    });

    await test('通过扩展贡献的 snippet（editor.action.insertSnippet name=tt）插入也会折叠', async () => {
        const editor = await openGoFile(workspace, 'void/contributed/main.go', '// time: x\n\n\n');
        editor.selection = new vscode.Selection(2, 0, 2, 0);
        await vscode.commands.executeCommand('editor.action.insertSnippet', { langId: 'go', name: 'tt' });
        await waitFor('文档包含 #region main', () => editor.document.getText().includes('// #region main'), 5_000);
        assert.strictEqual(editor.document.lineAt(2).text, '// #region main');
        const ms = await waitFor('第 2 行被折叠', () => isFolded(editor, 2), 15_000);
        console.log(`    折叠用时 ${ms}ms`);
        const endregion = snippets.tt.body.findIndex((l) => l.includes('#endregion'));
        // 折叠后可见区间应从 // #endregion main 的下一行继续
        assert.ok(
            editor.visibleRanges.some((r) => r.start.line === 2 + endregion + 1),
            `可见区间应从第 ${2 + endregion + 1} 行继续: ${JSON.stringify(editor.visibleRanges.map((r) => [r.start.line, r.end.line]))}`,
        );
    });

    await test('同一文件里第二次插入模板仍会折叠', async () => {
        const editor = await openGoFile(workspace, 'void/twice/main.go', '// time: x\n\n\n');
        editor.selection = new vscode.Selection(2, 0, 2, 0);
        await editor.insertSnippet(new vscode.SnippetString(cpBody));
        await waitFor('第一次折叠', () => isFolded(editor, 2), 15_000);

        // 清空后再插一次
        await editor.edit((b) => b.delete(new vscode.Range(0, 0, editor.document.lineCount, 0)));
        await editor.edit((b) => b.insert(new vscode.Position(0, 0), '// time: y\n\n\n'));
        await sleep(300);
        editor.selection = new vscode.Selection(2, 0, 2, 0);
        await editor.insertSnippet(new vscode.SnippetString(cpBody));
        const ms = await waitFor('第二次折叠', () => isFolded(editor, 2), 15_000);
        console.log(`    第二次折叠用时 ${ms}ms`);
    });

    await test('用户手动展开后不会被折回去', async () => {
        const editor = await openGoFile(workspace, 'void/unfold/main.go', '// time: x\n\n\n');
        editor.selection = new vscode.Selection(2, 0, 2, 0);
        await editor.insertSnippet(new vscode.SnippetString(cpBody));
        await waitFor('折叠', () => isFolded(editor, 2), 15_000);
        await vscode.commands.executeCommand('editor.unfold', { levels: 1, selectionLines: [2] });
        await waitFor('展开生效', () => !isFolded(editor, 2), 3_000);
        await sleep(5_000); // 覆盖 autoFold 剩余的重试窗口
        assert.strictEqual(isFolded(editor, 2), false, '手动展开后 5 秒内不应被再次折叠');
    });

    await test('关闭「自动折叠骨架」设置后不再折叠', async () => {
        const config = vscode.workspace.getConfiguration('gocph');
        await config.update('自动折叠骨架', false, vscode.ConfigurationTarget.Global);
        try {
            const editor = await openGoFile(workspace, 'void/disabled/main.go', '// time: x\n\n\n');
            editor.selection = new vscode.Selection(2, 0, 2, 0);
            await editor.insertSnippet(new vscode.SnippetString(cpBody));
            await sleep(3000);
            assert.strictEqual(isFolded(editor, 2), false);
        } finally {
            await config.update('自动折叠骨架', undefined, vscode.ConfigurationTarget.Global);
        }
    });

    if (failures.length > 0) {
        throw new Error(`${failures.length} 个集成测试失败: ${failures.join('; ')}`);
    }
    console.log('\n[suite] 全部通过');
}

async function waitFor2Ranges(
    uri: vscode.Uri,
    ready: (ranges: vscode.FoldingRange[]) => boolean,
): Promise<vscode.FoldingRange[]> {
    let ranges: vscode.FoldingRange[] = [];
    await waitFor(
        '折叠范围就绪',
        async () => {
            ranges = (await vscode.commands.executeCommand<vscode.FoldingRange[]>('vscode.executeFoldingRangeProvider', uri)) ?? [];
            return ready(ranges);
        },
        15_000,
    );
    return ranges;
}
