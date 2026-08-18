"""p1 运营工作台模块测试（B 维护）—— 模块测试范式参考。

每模块成员按此范式写自己的测试：
  1. 页面能打开、无 console error
  2. 核心元素存在
  3. 关键交互行为
"""
import re


def _console_errors(page):
    errors = []
    page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
    return errors


def test_p1_loads_without_errors(page, base_url):
    errors = _console_errors(page)
    page.goto(f"{base_url}/pages/p1.html")
    page.wait_for_load_state("networkidle")
    assert page.title() != "", "页面无标题"
    assert len(errors) == 0, f"页面 console 报错: {errors}"


def test_p1_has_title_and_app(page, base_url):
    page.goto(f"{base_url}/pages/p1.html")
    app = page.locator("#app")
    assert app.is_visible(), "#app 未渲染"
    assert "运营工作台" in page.locator("#app").inner_text() or "运营工作台" in page.title()


def test_nav_links_reachable(page, base_url):
    """从 p1 点导航能到达 p2。"""
    page.goto(f"{base_url}/pages/p1.html")
    p2_link = page.locator('#site-nav a[href="pages/p2.html"]')
    assert p2_link.is_visible()
    p2_link.click()
    page.wait_for_load_state("networkidle")
    assert "p2" in page.url or re.search(r"p2\.html", page.url)
