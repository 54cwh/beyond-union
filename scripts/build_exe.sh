#!/usr/bin/env bash
# 打包北域绿联为单 EXE（E 职责，在 Windows 或 Wine+Windows Python 下执行）
# 用法: bash scripts/build_exe.sh
# 说明: 使用 北域绿联.spec（datas 元组写法），Windows/Linux/Wine 均不依赖路径分隔符
set -euo pipefail

DIST="dist"
APP_NAME="北域绿联"

# 打包：--onefile 单 EXE，资源全部随包（见 北域绿联.spec）
uv run pyinstaller "北域绿联.spec"

echo "打包完成 → $DIST/$APP_NAME.exe"
echo "验收：Windows 成员双击 EXE 验 GUI；Wine 下用 '$APP_NAME.exe --web' 验浏览器模式"
