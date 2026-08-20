"""p4 绿电入市决策中心 E2E 测试（C 前端）：导航 / 模块渲染 / 生成策略 / 情景推演。

当前用需求示例数字内联渲染（A 数据合并后切 data/demo，页面结构不变）。
"""
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def test_p4_nav_renders(page, base_url):
    """导航 6 项且 p4 高亮为当前页。"""
    page.goto(f"{base_url}/pages/p4.html")
    nav = page.locator("#site-nav a")
    assert nav.count() == 6
    assert nav.nth(3).get_attribute("href") == "/pages/p4.html"
    assert "is-active" in (nav.nth(3).get_attribute("class") or "")


def test_p4_modules_render(page, base_url):
    """8 模块 + 情景实验室全部渲染，含收益-风险散点图。"""
    page.goto(f"{base_url}/pages/p4.html")
    body = page.inner_text("body")
    for kw in ["市场雷达", "企业资源池", "方案生成器", "三方案决策卡",
               "收益—风险地图", "决策解释", "市场规则影响", "AI 经营情景实验室"]:
        assert kw in body, f"缺少模块: {kw}"
    assert page.locator("canvas").count() >= 1, "收益-风险散点图未渲染"


def test_p4_gen_strategy(page, base_url):
    """方案生成器：默认推荐 B，切『激进』后推荐 C。"""
    page.goto(f"{base_url}/pages/p4.html")
    assert "AI 推荐方案 B" in page.inner_text("body"), "默认应推荐方案 B"
    page.get_by_role("button", name="激进").click()
    page.get_by_role("button", name="生成策略").click()
    page.wait_for_timeout(300)
    assert "AI 推荐方案 C" in page.inner_text("body"), "激进偏好应推荐方案 C"


def test_p4_simulation(page, base_url):
    """情景实验室：选场景 → 推演 → 显示优化后方案与 AI 应对措施。"""
    page.goto(f"{base_url}/pages/p4.html")
    page.get_by_role("button", name="风速骤降30%").click()
    page.get_by_role("button", name="开始推演").click()
    page.wait_for_timeout(1500)
    body = page.inner_text("body")
    assert "优化后方案" in body, "推演后未显示优化方案"
    assert "AI 应对措施" in body, "推演后未显示应对措施"
