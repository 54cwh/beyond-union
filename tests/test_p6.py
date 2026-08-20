"""p6 经营成效中心 E2E 测试（A 数据岗）：导航 / Tab 切换 / 数据加载 / 图表。

数据基准：data/demo/（见 data/CONTRACT.md），用例按契约行数断言。
"""
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def _demo(name):
    with open(BASE_DIR / "data" / "demo" / f"{name}.json", encoding="utf-8") as f:
        return json.load(f)


def test_p6_nav_renders(page, base_url):
    """导航 6 项且 p6 高亮为当前页。"""
    page.goto(f"{base_url}/pages/p6.html")
    nav = page.locator("#site-nav a")
    assert nav.count() == 6
    assert nav.nth(5).get_attribute("href") == "/pages/p6.html"
    assert "is-active" in (nav.nth(5).get_attribute("class") or "")


def test_p6_tabs_exist(page, base_url):
    """三个板块 Tab 齐全。"""
    page.goto(f"{base_url}/pages/p6.html")
    tabs = page.locator("#app button").all_inner_texts()
    assert "经营成效" in tabs and "案例验证" in tabs and "数据可信" in tabs


def test_p6_perf_section_renders(page, base_url):
    """经营成效板块：KPI + 图表 + 明细表，数据与契约一致。"""
    page.goto(f"{base_url}/pages/p6.html")
    page.get_by_text("本月经营成绩").wait_for()
    body = page.inner_text("body")
    for kw in ["本月经营成绩", "AI 优化成效", "三栏对比明细", "累计优化决策", "模型效果", "数据更新"]:
        assert kw in body, f"经营成效板块缺少: {kw}"
    # 三栏对比柱状图
    assert page.locator("canvas").count() >= 1, "三栏对比图表未渲染"
    # 明细表行数 >= 近 7 天
    rows = page.locator("#app table tbody tr").count()
    assert rows >= 7, f"明细表行数不足: {rows}"


def test_p6_case_section(page, base_url):
    """切换『案例验证』：案例名来自 cases.json。"""
    page.goto(f"{base_url}/pages/p6.html")
    page.get_by_text("本月经营成绩").wait_for()
    page.get_by_role("button", name="案例验证").click()
    page.wait_for_timeout(300)
    body = page.inner_text("body")
    cases = _demo("cases")["cases"]
    assert len(cases) >= 12, "案例库条数不足"
    assert cases[0]["name"] in body, "案例板块未渲染案例"


def test_p6_trust_section(page, base_url):
    """切换『数据可信』：血缘与模型档案渲染。"""
    page.goto(f"{base_url}/pages/p6.html")
    page.get_by_text("本月经营成绩").wait_for()
    page.get_by_role("button", name="数据可信").click()
    page.wait_for_timeout(300)
    body = page.inner_text("body")
    prov = _demo("provenance")
    assert prov["lineage"][0]["id"] in body, "数据血缘未渲染"
    assert "模型档案" in body
