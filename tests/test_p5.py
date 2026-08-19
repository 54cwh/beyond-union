"""p5 决策与政策中心 E2E 测试（E 集成岗）：导航 / 政策中心 / 决策任务 / 状态流转。

数据源：data/demo/policy.json + data/demo/tasks.json（A 数据岗产出）。
"""


def test_p5_nav_renders(page, base_url):
    """导航 6 项且 p5 高亮为当前页。"""
    page.goto(f"{base_url}/pages/p5.html")
    nav = page.locator("#site-nav a")
    assert nav.count() == 6
    assert nav.nth(4).get_attribute("href") == "/pages/p5.html"
    assert (nav.nth(4).get_attribute("class") or "").find("active") >= 0


def test_p5_policy_module(page, base_url):
    """政策中心：统计卡 + 表格 + 过滤 + 展开影响分析/溯源。"""
    page.goto(f"{base_url}/pages/p5.html")
    body = page.inner_text("#app")
    # 统计卡
    assert "政策总数" in body
    assert "覆盖分类" in body
    assert "已实施" in body
    # 政策表格（A 数据 8 条，仅可见表格）
    assert "深化新能源上网电价市场化改革" in body
    table = page.locator(".p5-table:visible")
    assert table.locator("tbody tr").count() == 8
    # 分类过滤
    page.locator(".p5-filter-btn", has_text="现货交易").click()
    page.wait_for_timeout(300)
    assert table.locator("tbody tr").count() == 4
    page.locator(".p5-filter-btn", has_text="全部").click()
    page.wait_for_timeout(200)
    # 展开影响分析 + 溯源（文号在展开区）
    table.locator("tbody tr").first.click()
    page.wait_for_timeout(300)
    body = page.inner_text("#app")
    assert "企业影响" in body
    assert "来源" in body
    assert "发改价格〔2025〕136号" in body


def test_p5_task_module(page, base_url):
    """决策任务中心：8 条任务 + 负责人/模型/置信度/风险 + 链路。"""
    page.goto(f"{base_url}/pages/p5.html")
    page.locator("button", has_text="决策任务中心").click()
    page.wait_for_timeout(300)
    body = page.inner_text("#app")
    assert "确认明日发电预测" in body
    assert "确认储能运行计划" in body
    assert "WindForecast" in body
    assert "置信度" in body
    assert "D2026" in body  # 决策单号
    assert page.locator(".p5-link-node").count() == 7
    table = page.locator(".p5-table:visible")
    assert table.locator("tbody tr").count() == 8


def test_p5_task_advance(page, base_url):
    """状态流转：已确认 → 推进 → 待人工确认；状态链说明展示。"""
    page.goto(f"{base_url}/pages/p5.html")
    page.locator("button", has_text="决策任务中心").click()
    page.wait_for_timeout(300)
    # 第一条任务默认「已确认」，推进到「待人工确认」
    first = page.locator("button", has_text="推进").first
    assert "已确认" in page.inner_text("#app")
    first.click()
    page.wait_for_timeout(200)
    body = page.inner_text("#app")
    assert "待人工确认" in body
    assert "效果复盘" in body  # 状态链说明
