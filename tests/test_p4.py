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
    """市场行情 Tab：报价条 + 主图；AI 交易决策 Tab：基本信息 + AI 对话。"""
    page.goto(f"{base_url}/pages/p4.html")
    body = page.inner_text("body")
    # Tab1 市场行情
    for kw in ["中长期", "日前 vs 实时价格", "发电 vs 电价", "市场快讯", "交易规则速览", "锚点价格"]:
        assert kw in body, f"缺少模块: {kw}"
    assert page.locator("canvas").count() >= 2, "市场图表未渲染"
    # Tab2 AI 交易决策
    page.locator(".p1-header button", has_text="AI 交易决策").click()
    page.wait_for_timeout(400)
    body = page.inner_text("body")
    for kw in ["明日预测发电", "可灵活交易", "AI 交易助手", "生成交易方案", "风速骤降推演"]:
        assert kw in body, f"缺少模块: {kw}"


def test_p4_gen_strategy(page, base_url):
    """AI 对话：点预设『生成交易方案』→ 推荐方案卡。"""
    page.goto(f"{base_url}/pages/p4.html")
    page.locator(".p1-header button", has_text="AI 交易决策").click()
    page.wait_for_timeout(400)
    page.fill("#p4-lab-input", "帮我生成明天的交易方案")
    page.locator("#p4-lab-send").scroll_into_view_if_needed()
    page.click("#p4-lab-send")
    page.wait_for_timeout(300)
    body = page.inner_text("#app")
    assert "均衡策略" in body, "应推荐均衡策略"
    assert "基准收益" in body, "方案卡缺基准收益"
    assert "确认此方案" in body, "方案卡缺确认按钮"


def test_p4_simulation(page, base_url):
    """AI 对话：风速推演 + 规则提问。"""
    page.goto(f"{base_url}/pages/p4.html")
    page.locator(".p1-header button", has_text="AI 交易决策").click()
    page.wait_for_timeout(400)
    page.fill("#p4-lab-input", "风速降 30% 会怎样")
    page.locator("#p4-lab-send").scroll_into_view_if_needed()
    page.click("#p4-lab-send")
    page.wait_for_timeout(300)
    assert "置信度" in page.inner_text("#app"), "推演未显示置信度"
    page.fill("#p4-lab-input", "有哪些交易规则")
    page.locator("#p4-lab-send").scroll_into_view_if_needed()
    page.click("#p4-lab-send")
    page.wait_for_timeout(300)
    assert "吉林" in page.inner_text("#app"), "规则未显示"
