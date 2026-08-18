"""挑战杯 Demo 双模式启动器

用法:
    python app.py                 # 默认 GUI 窗口 (pywebview)
    python app.py --web           # 浏览器模式 (兜底)
    python app.py --mode web      # 同上
    python app.py --port 8000     # 指定端口 (默认自动找空闲端口)
"""
import argparse
import json
import socket
import sys
import threading
import webbrowser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_PAGE = "pages/p1.html"


def find_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


class AppHandler(SimpleHTTPRequestHandler):
    """带 /api/shutdown 和 /api/health 的静态文件服务器"""

    def __init__(self, *args, directory=None, **kwargs):
        super().__init__(*args, directory=directory, **kwargs)

    def do_GET(self):
        if self.path == "/api/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok"}).encode("utf-8"))
            return
        if self.path == "/api/shutdown":
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"shutting down")
            threading.Thread(target=self.server.shutdown, daemon=True).start()
            return
        super().do_GET()

    def log_message(self, format, *args):
        sys.stdout.write("[server] %s\n" % (format % args))


def start_server(port):
    handler = partial(AppHandler, directory=str(BASE_DIR))
    httpd = ThreadingHTTPServer(("127.0.0.1", port), handler)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    return httpd


def open_gui(url):
    try:
        import webview

        webview.create_window("挑战杯 Demo", url, width=1280, height=800)
        webview.start()
    except ImportError:
        print("[warn] pywebview 未安装，降级为浏览器模式")
        webbrowser.open(url)
        input("按 Enter 退出...")
    except Exception as e:
        print(f"[warn] GUI 启动失败（{e}），降级为浏览器模式")
        webbrowser.open(url)
        input("按 Enter 退出...")


def main():
    parser = argparse.ArgumentParser(description="挑战杯 Demo 启动器")
    parser.add_argument("--mode", choices=["gui", "web"], default="gui")
    parser.add_argument("--web", action="store_true", help="浏览器模式（快捷方式）")
    parser.add_argument("--port", type=int, default=0, help="指定端口（默认自动找空闲）")
    args = parser.parse_args()

    mode = "web" if args.web else args.mode
    port = args.port or find_free_port()
    url = f"http://127.0.0.1:{port}/{DEFAULT_PAGE}"

    httpd = start_server(port)
    print(f"[app] 服务已启动: {url}")

    if mode == "web":
        webbrowser.open(url)
        print("[app] 浏览器模式。按 Enter 退出（浏览器标签页关闭不会退出）")
        try:
            input()
        except (KeyboardInterrupt, EOFError):
            pass
    else:
        open_gui(url)

    print("[app] 正在关闭...")
    httpd.shutdown()
    httpd.server_close()


if __name__ == "__main__":
    main()
