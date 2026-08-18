#!/usr/bin/env bash
# 编译 Tailwind v3.4 → assets/tailwind.css
# 任何人改页面 class 后必须重跑本脚本（否则新 class 静默缺样式）
# 注：TAILWIND_BIN 是"本机工具路径约定"（非项目内路径），是"禁止绝对路径"规则的例外；
#     仅作为默认值，可用环境变量 TAILWIND_BIN 覆盖为本机实际位置。
set -euo pipefail

TAILWIND_BIN="${TAILWIND_BIN:-/tmp/tailwindcss}"

if [ ! -x "$TAILWIND_BIN" ]; then
  echo "未找到 Tailwind CLI：$TAILWIND_BIN"
  echo "请下载 v3.4.x standalone："
  echo "  Linux:   https://github.com/tailwindlabs/tailwindcss/releases/download/v3.4.17/tailwindcss-linux-x64"
  echo "  Windows: https://github.com/tailwindlabs/tailwindcss/releases/download/v3.4.17/tailwindcss-windows-x64.exe"
  echo "  macOS:   https://github.com/tailwindlabs/tailwindcss/releases/download/v3.4.17/tailwindcss-macos-arm64"
  echo "然后设置环境变量 TAILWIND_BIN 指向它。"
  exit 1
fi

"$TAILWIND_BIN" -i assets/tailwind.src.css -o assets/tailwind.css --minify
echo "编译完成 → assets/tailwind.css"
