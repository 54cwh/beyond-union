#!/usr/bin/env bash
# 打包挑战杯 Demo 为单 EXE（E 职责，在 Windows 或 Wine+Windows Python 下执行）
# 用法: bash scripts/build_exe.sh
set -euo pipefail

# 产物目录
DIST="dist"
APP_NAME="挑战杯Demo"

# 打包：--onefile 单 EXE，--add-data 打入全部资源
uv run pyinstaller \
  --onefile \
  --name "$APP_NAME" \
  --add-data "pages:pages" \
  --add-data "assets:assets" \
  --add-data "data:data" \
  --add-data "template.html:." \
  --hidden-import bottle \
  app.py

echo "打包完成 → $DIST/$APP_NAME.exe"
echo "验收：Windows 成员双击 EXE 验 GUI；Wine 下用 '$APP_NAME.exe --web' 验浏览器模式"
