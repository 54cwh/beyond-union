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
    assert (nav.nth(3).get_attribute("class") or "").find("active") >= 0


def test_p4_modules_render(page, base_url):
    """市场行情 Tab：折线图 + 价格卡；交易决策 Tab：方案生成器 + 三方案卡。"""
    page.goto(f"{base_url}/pages/p4.html")
    body = page.inner_text("body")
    # Tab1 市场行情
    for kw in ["市场雷达", "日前 vs 实时价格", "中长期月度均价", "绿色电力溢价"]:
        assert kw in body, f"缺少模块: {kw}"
    assert page.locator("canvas").count() >= 1, "市场折线图未渲染"
    # Tab2 交易决策
    page.locator(".p1-header button", has_text="交易决策").click()
    page.wait_for_timeout(400)
    body = page.inner_text("body")
    for kw in ["企业资源池", "方案生成器", "三方案决策卡", "收益—风险地图", "决策解释"]:
        assert kw in body, f"缺少模块: {kw}"
    # Tab3 情景推演
    page.locator(".p1-header button", has_text="情景推演").click()
    page.wait_for_timeout(400)
    body = page.inner_text("body")
    for kw in ["市场规则影响", "AI 经营情景实验室"]:
        assert kw in body, f"缺少模块: {kw}"


def test_p4_gen_strategy(page, base_url):
    """方案生成器：默认推荐 B，切『激进』后推荐 C（在交易决策 Tab）。"""
    page.goto(f"{base_url}/pages/p4.html")
    page.locator(".p1-header button", has_text="交易决策").click()
    page.wait_for_timeout(400)
    assert "AI 推荐方案 B" in page.inner_text("body"), "默认应推荐方案 B"
    page.get_by_role("button", name="激进").click()
    page.get_by_role("button", name="生成策略").click()
    page.wait_for_timeout(300)
    assert "AI 推荐方案 C" in page.inner_text("body"), "激进偏好应推荐方案 C"


def test_p4_simulation(page, base_url):
    """情景实验室（情景推演 Tab）：点场景 → 推演消息 → 自由提问。"""
    page.goto(f"{base_url}/pages/p4.html")
    page.locator(".p1-header button", has_text="情景推演").click()
    page.wait_for_timeout(400)
    body = page.inner_text("#app")
    assert "AI 经营情景实验室" in body, "缺少情景实验室卡片"
    page.locator(".p4-lab-scenes .p4-chip", has_text="风速骤降30%").click()
    page.wait_for_timeout(300)
    lab = page.locator(".p4-lab-body")
    assert "→" in lab.inner_text(), "推演未显示方案对比"
    assert "置信度" in lab.inner_text(), "推演未显示置信度"
    page.fill("#p4-lab-input", "如果光伏出力降 25% 会怎样")
    page.click("#p4-lab-send")
    page.wait_for_timeout(300)
    assert "光伏" in lab.inner_text(), "自由提问未匹配光伏场景"
