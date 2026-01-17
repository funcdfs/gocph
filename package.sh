#!/bin/bash

# GoCPH 扩展打包脚本
# 用法: ./package.sh [选项]
# 选项:
#   --install    打包后自动安装到 VSCode
#   --clean      打包前清理旧的构建文件

set -e  # 遇到错误立即退出

INSTALL=false
CLEAN=false

# 解析参数
for arg in "$@"; do
    case $arg in
        --install)
            INSTALL=true
            ;;
        --clean)
            CLEAN=true
            ;;
        *)
            echo "未知参数: $arg"
            echo "用法: ./package.sh [--install] [--clean]"
            exit 1
            ;;
    esac
done

echo "🚀 开始打包 GoCPH 扩展..."

# 进入 gocph 目录
cd gocph

if [ "$CLEAN" = true ]; then
    echo "🧹 清理旧的构建文件..."
    npm run clean 2>/dev/null || true
fi

echo "📦 安装依赖..."
npm install --silent

echo "🔨 构建项目..."
npm run build

echo "📦 打包 VSIX..."
npx @vscode/vsce package --no-git-tag-version 2>/dev/null || npx @vscode/vsce package

echo ""
echo "✅ 打包完成！"
echo ""
echo "生成的文件："
ls -lh *.vsix | tail -1

VSIX_FILE=$(ls -t *.vsix | head -1)

if [ "$INSTALL" = true ]; then
    echo ""
    echo "📥 正在安装到 VSCode..."
    code --install-extension "$VSIX_FILE" --force
    echo "✅ 安装完成！请重新加载 VSCode 窗口。"
fi

# 返回根目录
cd ..

echo ""
echo "💡 手动安装方式："
echo "   code --install-extension gocph/$VSIX_FILE"
echo ""
echo "💡 或者在 VSCode 中："
echo "   1. 打开扩展面板 (Cmd+Shift+X)"
echo "   2. 点击 '...' 菜单"
echo "   3. 选择 '从 VSIX 安装...'"
echo "   4. 选择 gocph/$VSIX_FILE"
