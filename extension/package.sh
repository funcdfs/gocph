#!/bin/bash

# GoCPH 扩展打包脚本
# 用法: ./package.sh [选项]
# 选项:
#   --install    打包后自动安装到 VS Code
#   --clean      打包前清理旧的构建产物
# 产物: 本目录下的 gocph-<version>.vsix（已被 .gitignore 忽略）

set -e
cd "$(dirname "$0")"

INSTALL=false
CLEAN=false

for arg in "$@"; do
    case $arg in
        --install) INSTALL=true ;;
        --clean) CLEAN=true ;;
        *)
            echo "未知参数: $arg"
            echo "用法: ./package.sh [--install] [--clean]"
            exit 1
            ;;
    esac
done

if [ "$CLEAN" = true ]; then
    echo "🧹 清理旧的构建产物..."
    npm run clean
fi

echo "📦 安装依赖..."
npm install --silent

echo "🔍 类型检查 / lint / 单元测试..."
npm run check

VERSION=$(node -p "require('./package.json').version")
VSIX="gocph-${VERSION}.vsix"

echo "📦 打包 VSIX (v${VERSION})..."
# vsce 会先执行 vscode:prepublish（即 npm run build）
npx vsce package --no-git-tag-version --out "$VSIX"

echo ""
echo "✅ 打包完成：$(pwd)/$VSIX"
ls -lh "$VSIX"

if [ "$INSTALL" = true ]; then
    echo ""
    echo "📥 安装到 VS Code..."
    code --install-extension "$VSIX" --force
    echo "✅ 安装完成，请重新加载 VS Code 窗口。"
else
    echo ""
    echo "💡 安装：code --install-extension $VSIX"
fi
