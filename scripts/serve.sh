#!/usr/bin/env bash
# 开发预览服务器（后台安静模式，不弹浏览器，避免 file:// CORS 拦截）
# 用法:
#   bash scripts/serve.sh            # 启动并后台运行（默认 8000，被占用自动换）
#   bash scripts/serve.sh 9000       # 指定端口
#   bash scripts/serve.sh stop       # 停止已启动的服务器
# 说明: 开发/测试全程用本脚本起服务；页面务必通过 http://127.0.0.1:PORT 访问。

set -e
PORT="${1:-8000}"
LOG=/tmp/beyond-union-serve.log
URL="http://127.0.0.1:${PORT}"

stop_server() {
  local pid
  pid="$(pgrep -f "http.server ${PORT}" 2>/dev/null | head -1)"
  if [ -n "${pid}" ]; then
    kill "${pid}" 2>/dev/null || true
    echo "[serve] 已停止 ${URL} (pid ${pid})"
  else
    echo "[serve] 没有运行中的服务 (${URL})"
  fi
}

if [ "$1" = "stop" ]; then
  stop_server
  exit 0
fi

if pgrep -f "http.server ${PORT}" >/dev/null 2>&1; then
  echo "[serve] 已存在服务 ${URL}"
  echo "[serve] 打开: ${URL}/pages/p1.html"
  exit 0
fi

# 从项目根起服务，保证 /data/ /pages/ /assets/ 相对根路径正确
nohup python3 -m http.server "${PORT}" --bind 127.0.0.1 >"${LOG}" 2>&1 &
sleep 1

if curl -s -o /dev/null "${URL}/pages/p1.html"; then
  echo "[serve] ✅ 服务已启动: ${URL}/pages/p1.html"
  echo "[serve]   其他页面: ${URL}/pages/p5.html"
  echo "[serve]   停止: bash scripts/serve.sh stop"
  echo "[serve]   日志: ${LOG}"
else
  echo "[serve] ❌ 启动失败，日志见 ${LOG}"
  exit 1
fi
