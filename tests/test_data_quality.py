"""数据质量测试（A 数据岗自查）—— data/demo/*.json 行数/空值/字段类型/值域/自洽性。

对应 data/CONTRACT.md「数据质量报告」，供 E 验收参考。
纯数据校验，不启动浏览器。
"""
import json
import math
from pathlib import Path

import pytest

BASE_DIR = Path(__file__).resolve().parent.parent
DEMO = BASE_DIR / "data" / "demo"

FILES = [
    "weather", "generation", "storage", "market",
    "revenue", "policy", "tasks", "cases", "provenance",
]

# CONTRACT 声明：各数组行数
EXPECTED_COUNTS = {
    "weather": {"forecast": 72, "monthly": 12},
    "generation": {"forecast": 96, "actual": 96},
    "storage": {"schedule": 48},
    "market": {"day_ahead": 72, "real_time": 72, "midterm_monthly": 12, "anchors": 12, "rules": 7},
    "revenue": {"comparison": 30},
    "policy": {"list": 13},
    "tasks": {"tasks": 8},
    "cases": {"cases": 12},
    "provenance": {"lineage": 18, "models": 6},
}

# CONTRACT 声明：关键数值字段（数组内每一行都须为 number 且非空）
NUMERIC_FIELDS = {
    "weather": ["wind_speed", "wind_dir", "temp", "humidity", "pressure", "irradiance", "cloud"],
    "generation": ["gen_total", "wind_power", "pv_power", "lower", "upper"],
    "storage": ["soc", "storage_power"],
    "market": ["price"],
    "revenue": ["baseline_revenue", "ai_revenue", "actual_revenue",
                "baseline_gen", "ai_gen", "actual_gen",
                "baseline_cost", "ai_cost", "actual_cost"],
    "cases": ["level"],
}


def load(name):
    with open(DEMO / f"{name}.json", encoding="utf-8") as f:
        return json.load(f)


def _all_rows(obj):
    """把顶层所有数组平铺成 (数组键, 行列表) 对。"""
    for key, rows in obj.items():
        if isinstance(rows, list):
            yield key, rows


@pytest.mark.parametrize("name", FILES)
def test_file_valid_and_meta(name):
    """文件存在、JSON 合法、meta 必备字段齐全（支持 p6 溯源）。"""
    obj = load(name)
    assert isinstance(obj, dict)
    meta = obj.get("meta")
    assert isinstance(meta, dict), f"{name}.json 缺 meta"
    for field in ("source", "updated", "level"):
        assert meta.get(field), f"{name}.json meta.{field} 为空"


@pytest.mark.parametrize("name,key,count", [
    (n, k, c) for n, d in EXPECTED_COUNTS.items() for k, c in d.items()
])
def test_expected_count(name, key, count):
    """行数与 CONTRACT 声明一致。"""
    obj = load(name)
    rows = obj.get(key)
    assert isinstance(rows, list), f"{name}.json.{key} 应为数组"
    assert len(rows) == count, f"{name}.json.{key} 行数应为 {count}，实得 {len(rows)}"


@pytest.mark.parametrize("name,field", [
    (n, f) for n, fields in NUMERIC_FIELDS.items() for f in fields
])
def test_numeric_field_nonempty(name, field):
    """关键数值字段：全部为 number 且非空、非 NaN。"""
    obj = load(name)
    checked = 0
    for _, rows in _all_rows(obj):
        for r in rows:
            if field in r:
                checked += 1
                v = r[field]
                assert v is not None, f"{name}.json 字段 {field} 出现空值"
                assert isinstance(v, (int, float)) and not (isinstance(v, float) and math.isnan(v)), \
                    f"{name}.json 字段 {field} 非数值: {v!r}"
    assert checked > 0, f"{name}.json 未找到字段 {field}"


def test_generation_today_consistency():
    """自洽：today.total = wind + pv；置信区间包围 gen_total。"""
    g = load("generation")
    today = g["today"]
    assert abs(today["total"] - (today["wind"] + today["pv"])) < 0.01, \
        "today.total 应等于 wind + pv"
    for r in g["forecast"]:
        assert r["lower"] <= r["gen_total"] <= r["upper"], f"置信区间错误: {r['time']}"
        # 发电为 0 时上下界均为 0，故用 >=
        assert r["upper"] >= r["gen_total"]


def test_market_matches_generation_price():
    """自洽：market.day_ahead 与 generation.forecast.price_day_ahead 同源一致。"""
    g = load("generation")
    m = load("market")
    gen_prices = [r.get("price_day_ahead") for r in g["forecast"] if r.get("price_day_ahead") is not None]
    market_prices = [r["price"] for r in m["day_ahead"]]
    assert market_prices, "market.day_ahead 为空"
    assert gen_prices[: len(market_prices)] == market_prices, "日前电价与发电预测不同源"


def test_value_ranges():
    """值域：SOC∈[0,1]、置信度∈[0,1]、电价>0、发电非负。"""
    s = load("storage")
    assert 0 <= s["status"]["soc"] <= 1, "status.soc 越界"
    for r in s["schedule"]:
        assert 0 <= r["soc"] <= 1, f"SOC 越界: {r['soc']}"
    g = load("generation")
    assert 0 <= g["today"]["confidence"] <= 1, "confidence 越界"
    for r in g["forecast"]:
        assert r["gen_total"] >= 0 and r["wind_power"] >= 0 and r["pv_power"] >= 0, \
            f"发电量为负: {r['time']}"
    m = load("market")
    for r in m["day_ahead"]:
        assert r["price"] > 0, f"电价异常: {r['price']}"


def test_revenue_baseline_bounded():
    """口径：基准收益=AI/1.08、基准成本=AI/0.85（案例库口径，非虚构超界）。"""
    rv = load("revenue")
    for r in rv["comparison"]:
        assert r["ai_revenue"] > r["baseline_revenue"], "AI 收益应高于基准（模拟口径 +8%）"
        assert r["baseline_cost"] > r["ai_cost"], "AI 偏差成本应低于基准（模拟口径 -15%）"
