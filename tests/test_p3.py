"""p3 风光储优化中心模块测试（D 前端维护）—— 参照 tests/test_p1.py 范式。

覆盖：
  1. 页面能打开、无 console error
  2. 核心元素存在（顶部数字 / 时间轴 / 电价图 / 四方案表 / AI 卡片）
  3. 关键交互（时间尺度切换、模型约束展开、溯源弹层）
"""


def _console_errors(page):
    errors = []
    page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
    return errors


def test_p3_loads_without_errors(page, base_url):
    errors = _console_errors(page)
    page.goto(f"{base_url}/pages/p3.html")
    page.wait_for_load_state("networkidle")
    assert page.title() != "", "页面无标题"
    assert "风光储优化" in page.title()
    assert len(errors) == 0, f"页面 console 报错: {errors}"


def test_p3_core_content(page, base_url):
    page.goto(f"{base_url}/pages/p3.html")
    page.wait_for_load_state("networkidle")
    page.wait_for_selector(".card", timeout=10000)
    text = page.locator("#app").inner_text()
    # 顶部核心数字（来自 generation.today / storage.status / market 峰值）
    assert "91.7" in text, "缺少预计风电"
    assert "50.6" in text, "缺少预计光伏"
    assert "64.0%" in text, "缺少当前 SOC"
    assert "586.2" in text, "缺少峰值电价（应为 586.2 元/MWh 晚峰）"
    # 关键模块
    assert "能源优化时间轴" in text, "缺少时间轴"
    assert "四方案对比" in text, "缺少四方案对比"
    assert "AI 综合推荐" in text, "缺少 AI 推荐方案"
    assert "模型约束" in text, "缺少模型约束"


def test_p3_charts_rendered(page, base_url):
    page.goto(f"{base_url}/pages/p3.html")
    page.wait_for_load_state("networkidle")
    page.wait_for_selector("canvas", timeout=10000)
    # 主时间轴(timeline) + 电价小图(line) = 2 个画布
    assert page.locator("canvas").count() >= 2, "图表画布数量不足"


def test_p3_scheme_table(page, base_url):
    page.goto(f"{base_url}/pages/p3.html")
    page.wait_for_load_state("networkidle")
    page.wait_for_selector("table", timeout=10000)
    # 四方案对比：5 行（A/B/C/D/E）
    rows = page.locator("table tbody tr")
    assert rows.count() >= 5, "四方案对比表行数不足"
    text = page.locator("#app").inner_text()
    assert "AI 推荐" in text, "方案 E 缺少推荐徽标"


def test_p3_scale_and_constraint(page, base_url):
    page.goto(f"{base_url}/pages/p3.html")
    page.wait_for_load_state("networkidle")
    page.wait_for_selector("button:has-text('48H')", timeout=10000)
    # 时间尺度切换
    page.click("button:has-text('48H')")
    page.wait_for_timeout(600)
    # 模型约束展开
    page.click("text=查看模型约束")
    page.wait_for_timeout(500)
    text = page.locator("#app").inner_text()
    assert "最大充放电功率" in text, "模型约束未展开"
    assert "SOC 下限 / 上限" in text, "约束表缺少 SOC 项"


def test_p3_provenance_opens(page, base_url):
    page.goto(f"{base_url}/pages/p3.html")
    page.wait_for_load_state("networkidle")
    page.wait_for_selector("text=查看数据来源", timeout=10000)
    page.click("text=查看数据来源")
    page.wait_for_timeout(600)
    body = page.inner_text("body")
    assert "储能调度计划" in body or "数据来源" in body, "溯源弹层未打开"
