# GoCPH — Go 算法竞赛测试运行器

<img src="https://raw.githubusercontent.com/funcdfs/gocph/main/gocph/icon.png" width="96" alt="GoCPH" />

面向算法竞赛的 VS Code 扩展：一键跑样例、对拍输出、Competitive Companion 接题，外加一整套 Go 竞赛代码片段。

## 功能

- **样例测试**：读取 `main_test.go` 中的用例，编译并逐个运行 `main.go`，实时展示 AC / WA / TLE / 编译错误与运行耗时。
- **结果面板**：侧边栏 Webview 展示每个用例的输入、期望输出、实际输出与 stderr，可就地编辑用例后重跑。
- **Competitive Companion**：内置监听端口（默认 27121，与 CPH 兼容），浏览器插件一点即可生成题目目录、`main.go` 与带样例的 `main_test.go`。
- **代码片段**：80+ 条 Go 竞赛片段，含三套主模板与常用算法模板（DSU、堆、KMP、Z-function、字符串哈希、modInt、Lucas 等）。
- **自动折叠骨架**：插入模板后自动折叠 `// #region main` 里的 IO 骨架，只留下 `solve()`，且不打断 snippet 的 tabstop 跳转。
- **region 折叠支持**：内置 Go 的 `// #region` / `// #endregion` 折叠区域识别（gopls 不提供此能力），折叠箭头始终可用。

## 快捷键

| 快捷键 | 命令 |
| --- | --- |
| `Alt+1` | GoCPH: 运行所有测试 |
| `Alt+2` | GoCPH: 停止运行测试 |
| `Alt+3` | GoCPH: 复制代码 |

## 主要代码片段

| 前缀 | 说明 |
| --- | --- |
| `cp` | 单测试用例基础模板（含 `input` / `inputSlice` / `print` / `pln` / `printf` / `dbg`） |
| `pln` / `pf` | `pln(...)` 空格分隔打印并换行；`printf(...)` 格式化打印 |
| `tt` | 多测试用例模板，自动读取组数并循环调用 `solve(i+1)` |
| `ttna` | 多测试用例模板，自动读取 `n` 与长度为 `n` 的切片 `a` |
| `dsu` / `minHeap` / `maxHeap` | 并查集、最小堆、最大堆 |
| `kmp` / `zFunc` / `stringHash` | KMP、Z-algorithm、字符串双哈希 |
| `modInt` / `comb` / `lucas` | 自动取模整数、组合数、卢卡斯定理 |

其余片段（二分、gcd/lcm/abs、方向数组、位运算工具等）在 Go 文件里输入前缀即可看到补全提示。

## 配置项

| 配置 | 默认值 | 说明 |
| --- | --- | --- |
| `gocph.超时时间` | `10000` | 单个用例运行超时（毫秒） |
| `gocph.Go命令` | `go` | 编译 `.go` 文件使用的命令 |
| `gocph.编译参数` | `""` | 编译时附加的参数，空格分隔 |
| `gocph.编译成功时隐藏警告` | `true` | 编译成功时忽略并隐藏 stderr |
| `gocph.忽略标准错误` | `false` | 开启后非空 stderr 不判为失败 |
| `gocph.自动显示结果面板` | `true` | 打开关联测试的文件时自动展开面板 |
| `gocph.Companion端口` | `27121` | Competitive Companion 监听端口 |
| `gocph.自动折叠骨架` | `true` | 插入模板后自动折叠 `// #region main` |

## 依赖

需要本机已安装 Go 工具链，且 `go` 命令在 `PATH` 中。

## 许可

GPL-3.0-or-later，见 [LICENSE](https://github.com/funcdfs/gocph/blob/main/gocph/LICENSE)。
