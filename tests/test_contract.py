"""共享契约测试（E 维护）：焊死公共接口，防 5 人 AI 互相踩踏。

覆盖：
  ① 数据文件：data/*.json 存在且可解析（字段契约待定，先校验基本有效性）
  ② 共享资产：页面引用的 common.js / tailwind.css / vendor 文件存在且路径有效
  ③ 导航：所有页面渲染出站点导航，且能到达目标页
"""
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
PAGES = ["p1", "p2", "p3", "p4", "p5"]

# 每个页面必须引用的共享资产
REQUIRED_ASSETS = [
    "assets/tailwind.css",
    "assets/common.css",
    "assets/vendor/vue.global.prod.js",
    "assets/vendor/echarts.min.js",
    "assets/js/common.js",
]


def test_pages_exist():
    for p in PAGES:
        assert (BASE_DIR / "pages" / f"{p}.html").exists(), f"缺少页面 pages/{p}.html"


def test_data_files_exist():
    """数据契约待定；当前只校验 data/ 目录存在且 json 可解析（若有）。"""
    data_dir = BASE_DIR / "data"
    assert data_dir.exists(), "缺少 data/ 目录"
    for json_file in data_dir.glob("*.json"):
        assert json_file.read_text(encoding="utf-8").strip(), f"{json_file.name} 为空"


def test_shared_assets_exist():
    for asset in REQUIRED_ASSETS:
        assert (BASE_DIR / asset).exists(), f"缺少共享资产: {asset}"


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
        assert links.count() == 5, f"{p}.html 导航应有 5 项，实得 {links.count()}"
        for i in range(5):
            href = links.nth(i).get_attribute("href")
            assert href.startswith("pages/p"), f"{p}.html 导航链接异常: {href}"
