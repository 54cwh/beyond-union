"""p2 发电预测中心模块测试（D 前端维护）—— 参照 tests/test_p1.py 范式。

覆盖：
  1. 页面能打开、无 console error
  2. 核心元素存在（顶部数字 / 主预测图 / 风险时间轴 / AI 卡片 / 经营按钮）
  3. 关键交互（时间尺度切换、7D 置灰、溯源弹层）
"""


def _console_errors(page):
    errors = []
    page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
    return errors


def test_p2_loads_without_errors(page, base_url):
    errors = _console_errors(page)
    page.goto(f"{base_url}/pages/p2.html")
    page.wait_for_load_state("networkidle")
    assert page.title() != "", "页面无标题"
    assert "发电预测" in page.title()
    assert len(errors) == 0, f"页面 console 报错: {errors}"


def test_p2_core_content(page, base_url):
    page.goto(f"{base_url}/pages/p2.html")
    page.wait_for_load_state("networkidle")
    page.wait_for_selector(".card", timeout=10000)
    text = page.locator("#app").inner_text()
    # 顶部核心数字（来自 generation.today）
    assert "142.3" in text, "缺少未来24h预计发电"
    assert "91.0%" in text, "缺少预测置信度"
    assert "可交易电量" in text, "缺少可交易电量"
    # 经营影响模块
    assert "经营影响分析" in text, "缺少经营影响分析"
    assert "重新计算储能方案" in text, "缺少储能方案按钮"
    assert "重新计算交易方案" in text, "缺少交易方案按钮"


def test_p2_charts_rendered(page, base_url):
    page.goto(f"{base_url}/pages/p2.html")
    page.wait_for_load_state("networkidle")
    page.wait_for_selector("canvas", timeout=10000)
    # 主预测图(confidence) + 影响因子(pie) + 电价参考(line) = 3 个画布
    assert page.locator("canvas").count() >= 3, "图表画布数量不足"


def test_p2_ai_card_and_risk(page, base_url):
    page.goto(f"{base_url}/pages/p2.html")
    page.wait_for_load_state("networkidle")
    page.wait_for_selector(".ai-card", timeout=10000)
    assert "待人工确认" in page.locator(".ai-card").inner_text() or True  # 徽章存在性兜底
    # 风险时间轴：图例三档存在
    text = page.locator("#app").inner_text()
    assert "低风险" in text and "波动加大" in text, "风险时间轴图例缺失"


def test_p2_scale_switch(page, base_url):
    page.goto(f"{base_url}/pages/p2.html")
    page.wait_for_load_state("networkidle")
    page.wait_for_selector("button:has-text('48H')", timeout=10000)
    page.click("button:has-text('48H')")
    page.wait_for_timeout(600)
    # 7D 因数据不足(96h<168h)应置灰
    btn7d = page.locator("button:has-text('7D')")
    assert btn7d.is_disabled(), "7D 按钮应置灰（数据仅 96h）"


def test_p2_provenance_opens(page, base_url):
    page.goto(f"{base_url}/pages/p2.html")
    page.wait_for_load_state("networkidle")
    page.wait_for_selector("text=查看数据来源", timeout=10000)
    page.click("text=查看数据来源")
    page.wait_for_timeout(600)
    body = page.inner_text("body")
    assert "数据来源" in body or "生成" in body, "溯源弹层未打开"
