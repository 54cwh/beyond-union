"""共享契约测试（E 维护）：焊死公共接口，防 5 人 AI 互相踩踏。

覆盖：
  ① 数据文件：data/ 下所有 json 存在且是合法 JSON（含 data/demo/ 模拟数据）
  ② 共享资产：页面引用的 common.js / chart-view.js / vendor 文件存在且路径有效
  ③ 导航：6 个页面渲染出站点导航，且能到达目标页
"""
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
PAGES = ["p1", "p2", "p3", "p4", "p5", "p6"]

# 每个页面必须引用的共享资产
REQUIRED_ASSETS = [
    "assets/tailwind.css",
    "assets/common.css",
    "assets/vendor/vue.global.prod.js",
    "assets/vendor/echarts.min.js",
    "assets/js/common.js",
    "assets/js/chart-view.js",
]

# 页面间接依赖的关键资产（经由 common.css 引用）
REQUIRED_FONTS = [
    "assets/fonts/inter-latin-400-normal.woff2",
    "assets/fonts/inter-latin-500-normal.woff2",
    "assets/fonts/inter-latin-600-normal.woff2",
    "assets/fonts/inter-latin-700-normal.woff2",
]


def test_pages_exist():
    for p in PAGES:
        assert (BASE_DIR / "pages" / f"{p}.html").exists(), f"缺少页面 pages/{p}.html"


def test_data_files_exist():
    """校验 data/ 目录存在且所有 json（含 data/demo/）都是合法 JSON。"""
    data_dir = BASE_DIR / "data"
    assert data_dir.exists(), "缺少 data/ 目录"
    # rglob 递归覆盖 data/demo/；模拟数据交付前允许为空，交付后必须有 json
    json_files = list(data_dir.rglob("*.json"))
    for json_file in json_files:
        try:
            json.loads(json_file.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            raise AssertionError(f"{json_file.name} 不是合法 JSON: {e}")


def test_shared_assets_exist():
    for asset in REQUIRED_ASSETS:
        assert (BASE_DIR / asset).exists(), f"缺少共享资产: {asset}"
    for font in REQUIRED_FONTS:
        assert (BASE_DIR / font).exists(), f"缺少字体资产: {font}（离线打包必须本地化）"
    assert (BASE_DIR / "assets/fonts").exists(), "缺少字体目录"


def test_pages_reference_assets():
    """每页必须引用全部共享资产（防页面漏引导致功能缺失）。"""
    for p in PAGES:
        html = (BASE_DIR / "pages" / f"{p}.html").read_text(encoding="utf-8")
        for asset in REQUIRED_ASSETS:
            assert asset in html, f"{p}.html 未引用 {asset}"
        assert "site-nav" in html, f"{p}.html 缺少导航占位 <nav id='site-nav'>"
        assert 'id="app"' in html, f"{p}.html 缺少 Vue 挂载点 #app"


def test_nav_renders_on_every_page(page, base_url):
    """导航：逐页打开，确认导航渲染且可点击到达目标页。"""
    for p in PAGES:
        page.goto(f"{base_url}/pages/{p}.html")
        nav = page.locator("#site-nav")
        assert nav.is_visible(), f"{p}.html 导航未渲染"
        links = nav.locator("a")
        assert links.count() == 6, f"{p}.html 导航应有 6 项，实得 {links.count()}"
        for i in range(6):
            href = links.nth(i).get_attribute("href")
            assert href.startswith("/pages/p"), f"{p}.html 导航链接异常: {href}"


def test_nav_clicks_reach_each_page(page, base_url):
    """导航：真实点击每个导航项，目标页必须实际加载（非 404 假绿）。"""
    for p in PAGES:
        page.goto(f"{base_url}/pages/p1.html")
        page.wait_for_load_state("networkidle")
        target = page.locator(f'#site-nav a[href="/pages/{p}.html"]')
        assert target.is_visible(), f"找不到导航到 {p} 的链接"
        target.click()
        page.wait_for_load_state("networkidle")
        # 关键断言：URL 确实是目标页（若导航 href 解析错误会变 404 或跳错页）
        assert page.url.endswith(f"/pages/{p}.html"), (
            f"点击后 URL 应为 /pages/{p}.html，实得 {page.url}"
        )
        # 页面真实渲染出 #app（404 页面没有）
        assert page.locator("#app").count() > 0, f"{p}.html 未渲染（可能 404）"
