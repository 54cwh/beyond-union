# 数据契约（data/CONTRACT.md）

> **岗位**：A 数据岗（zzx）　|　**更新**：2026-08-19
> **对象**：B/C/D/E 取数依据　|　**配套**：`assets/js/README.md`（计算层 API 一节）
> **原则**：字段英文 key、数值用 number、顶层带 `meta` 支持溯源；全链路自洽（weather→generation→storage→market→revenue）

---

## 1. 数据总览

演示数据共 **9 个 JSON**，位于 `data/demo/*.json`，合计约 104 KB。

| 文件 | 数据域 | 数据量 | 可信等级 | 来源 | 主要消费页 |
|------|--------|--------|----------|------|-----------|
| `weather.json` | 气象（吉林白城 预报+月均） | 预报72条+月均12条 | Level 2 历史回测 | Open-Meteo(ERA5) | p2/p4 |
| `generation.json` | 发电（预测/实际/置信区间） | 预测96+实际96 | Level 1 模型模拟 | 本地物理模型(真实气象驱动) | p2/p4 |
| `storage.json` | 储能（参数/SOC/调度计划） | 调度48条 | Level 1 模型模拟 | 物理模型 | p3/p4 |
| `market.json` | 市场（电价/中长期/绿证/锚点/规则） | 日前72+实时72+月度12+锚点12+规则7 | Level 1(锚点真实) | 锚点校准+模型生成 | p4/p5 |
| `revenue.json` | 经营（成绩/三栏对比/累计效能） | 三栏对比30条 | Level 1 模型模拟 | 决策结果数据库(回测 MAPE 6.8%) | **p6** |
| `policy.json` | 政策（语料库精选） | 8条 | Level 2 真实(可溯源) | 官方文件结构化摘要 | p5/p6 |
| `tasks.json` | 任务（待办流转） | 8条 | Level 1 模型模拟 | 决策记录派生 | p1/p5/p6 |
| `cases.json` | 案例库 | 12条 | Level 1-5 | 真实回测+模板 | **p6** |
| `provenance.json` | 数据血缘+模型档案 | 血缘18+模型6 | Level 2 | 生成(结构) | **p6** |

> 页面加载方式：`await Data('demo/xxx')` → 取 `/data/demo/xxx.json`（`common.js` 导出 `Data = loadData` **函数**，直接调用，勿写 `Data.load`）。

---

## 2. 各数据集契约

### 2.1 `weather.json`
| 字段 | 类型 | 含义 |
|------|------|------|
| `meta.name` | string | 数据名 |
| `meta.source` | string | 来源（Open-Meteo/ERA5）|
| `meta.level` | string | 可信等级 |
| `meta.location` | string | 地点（吉林白城 45.6,122.8）|
| `forecast[].time` | string | 时间（`YYYY-MM-DD HH:00`）|
| `forecast[].wind_speed` | number | 10m 风速 m/s |
| `forecast[].wind_dir` | number | 10m 风向 ° |
| `forecast[].wind_speed_100m` | number | 100m 风速 m/s |
| `forecast[].temp` | number | 温度 ℃ |
| `forecast[].humidity` | number | 相对湿度 % |
| `forecast[].pressure` | number | 气压 hPa |
| `forecast[].irradiance` | number | 短波辐照 W/m² |
| `forecast[].cloud` | number | 云量 % |
| `monthly[].month/ghi_avg/ghi_month/dni_avg/wind_speed/temp` | number | 月均资源汇总 |

### 2.2 `generation.json`
| 字段 | 类型 | 含义 |
|------|------|------|
| `meta` | object | 项目信息（XM001 吉林西部风光储示范项目：风100MW/光50MW/储40MWh）|
| `today.wind/pv/total` | number | 明日预计发电（91.7/50.6/142.3 MWh）|
| `today.confidence` | number | 置信度 0.91 |
| `today.max_dev_pct` | number | 最大偏差 ±8.4% |
| `today.tradable` | number | 可交易电量 128.7 MWh |
| `today.storage_available_mwh` | number | 可调储能 18.2 MWh |
| `forecast[]` | array | 未来 96 小时逐时：`time/wind_power/pv_power/gen_total/lower/upper/price_day_ahead`（lower/upper 为 ±8.4% 置信区间）|
| `actual[]` | array | 历史 96 小时实际：`time/gen_total/soc` |
| `model` | object | 模型（WindForecast v1.4 MAPE 8.2 / PVForecast v1.2 MAPE 9.5）|

### 2.3 `storage.json`
| 字段 | 类型 | 含义 |
|------|------|------|
| `params.capacity_mwh/power_mw` | number | 40 MWh / 20 MW |
| `params.soc_min/soc_max` | number | 0.2 / 0.9（约束）|
| `params.charge_eff/discharge_eff` | number | 0.95 / 0.94 |
| `params.max_cycles_per_day` | number | 1（循环保护）|
| `status.soc/soh/available_mwh` | number | 当前 0.64 / 0.95 / 18.2 |
| `schedule[]` | array | 48 小时充放电计划：`time/storage_power/soc`（正=充电）|

### 2.4 `market.json`
| 字段 | 类型 | 含义 |
|------|------|------|
| `day_ahead[]`/`real_time[]` | array | 72 小时日前/实时电价：`time/price`（元/MWh，与 generation 同源自洽）|
| `midterm_monthly[]` | array | 吉林 12 个月：`month/yearly/monthly` 均价 |
| `green.premium/cert_price/ppa` | object | 绿电溢价 45 元/MWh、绿证 5.15 元/个、PPA 30 元/MWh |
| `anchors[]` | array | 官方锚点：`name/value/unit/source/url`（吉林 373.1、辽宁 374.9、现货 350…）|
| `rules[]` | array | 市场规则：`region/category/rule/basis` |

### 2.5 `revenue.json`（p6 核心）
| 字段 | 类型 | 含义 |
|------|------|------|
| `performance` | object | 本月成绩：发电/市场收入/储能收益/偏差成本（万元）|
| `comparison[]` | array | **基准 vs AI vs 实际** 三栏对比（30 天）|
| `comparison[].date` | string | 日期 |
| `comparison[].baseline_revenue/ai_revenue/actual_revenue` | number | 收益三栏（万元）|
| `comparison[].baseline_gen/ai_gen/actual_gen` | number | 发电三栏（MWh）|
| `comparison[].baseline_cost/ai_cost/actual_cost` | number | 偏差成本三栏（万元）|
| `cumulative` | object | 累计效能：决策90次/省成本18.6万/增收益32.4万/增消纳156MWh/平均MAPE 6.8% |
| `model_effect` | object | 模型效果（风电/光伏 MAPE、储能收益、采用率）|

### 2.6 `policy.json`
| 字段 | 类型 | 含义 |
|------|------|------|
| `list[]` | array | 政策：`id/title/agency/doc_no/published/region/category/key_change/impact/link/status/credit` |

### 2.7 `tasks.json`
| 字段 | 类型 | 含义 |
|------|------|------|
| `tasks[]` | array | 任务：`id/type/title/status/owner/decision_id/model/confidence/risk`（status 流转：待分析→AI已分析→待人工确认→已确认→已执行→等待结果→效果复盘）|

### 2.8 `cases.json`（p6 案例验证）
| 字段 | 类型 | 含义 |
|------|------|------|
| `cases[]` | array | 案例：`id/name/category/level/enterprise/scale/problem/modules/before/plan/result/feedback/period/verification/note`（level=可信等级 1-5）|

### 2.9 `provenance.json`（p6 数据可信）
| 字段 | 类型 | 含义 |
|------|------|------|
| `lineage[]` | array | 血缘：`id/source/time/process/model/output`（18 条）|
| `models[]` | array | 模型档案：`id/name/version/trained/dataset/mape_pct/mae/rmse/status`（6 个）|

---

## 3. 数据质量报告

| 文件 | 行数 | 空值率 | 字段类型 | 校验 |
|------|------|--------|----------|------|
| weather.json | 预报72/月均12 | 0% | number 全通过 | ✓ |
| generation.json | 预测96/实际96 | 0% | number 全通过 | ✓ |
| storage.json | 调度48 | 0% | number 全通过 | ✓ |
| market.json | 日前72/实时72/月度12/锚点12/规则7 | 0%（锚点来源URL 部分为空）| number 全通过 | ✓ |
| revenue.json | 三栏对比30 | 0% | number 全通过 | ✓ |
| policy.json | 8 | 0% | — | ✓ |
| tasks.json | 8 | 0% | number(confidence) 通过 | ✓ |
| cases.json | 12 | 0% | number(level) 通过 | ✓ |
| provenance.json | 血缘18/模型6 | 0% | number(mape等) 通过 | ✓ |

**口径说明（重要，页面/消费方须知）**：
1. **置信区间**（`generation.forecast.lower/upper`）：原始预测无区间，按需求示例"最大偏差 ±8.4%"等比构造，属 Level 1 模拟增强。
2. **基准方案**（`revenue.comparison.baseline_*`）：决策结果原始数据无基准栏，按案例库口径反推（AI 收益比基准 +8%、偏差成本 -15%、发电 +2%），属 Level 1 模拟。
3. **累计效能**（`revenue.cumulative`）：为需求示例值（决策90次/省成本18.6万等），非真实企业数据，展示时须如实标注"模拟"。
4. **电价序列**：`market.day_ahead/real_time` 与 `generation.forecast[].price_day_ahead` 同源自洽（取自同一物理模型输出），锚点（373.1 等）为真实官方来源（Level 2）。
5. **气象风速**：ERA5 100m 风速系统性偏高，10m 风速为原始值；发电出力已按东北实测做物理校准（见本地《数据采集说明.md》五.1，该文件不入库）。

---

## 4. 变更记录
| 日期 | 变更 | 影响 |
|------|------|------|
| 2026-08-19 | 初版：9 文件 + 契约 + 质量报告 | 全场取数依据 |
