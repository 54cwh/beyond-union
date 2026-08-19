# assets/js 说明

> 本目录为纯函数计算层与共享组件。**计算层由 A 数据岗维护**；页面只调用，禁止在页面内自写筛选/聚合/格式化逻辑（缺功能向 A 提）。
> 数据契约见 `data/CONTRACT.md`；图表组件接口见 `assets/js/chart-view.md`（B 维护）。

---

## 计算层 API（A 数据岗）

### `filter.js` —— 筛选 / 分组 / 聚合

| 函数 | 入参 | 返回值 | 说明 |
|------|------|--------|------|
| `filterRows(records, conditions)` | 记录数组；条件 `{字段: 值 \| [min,max] \| 数组}` | 过滤后数组 | 多维筛选；数字区间、枚举多选 |
| `groupBy(records, dims, aggs)` | 记录数组；维度（string 或 string[]）；聚合定义 `[{field, as, fn}]` | 分组数组 `{...维度, ...聚合, __count}` | fn 见 `aggregateFn` |
| `aggregateFn(fn)` | `'sum'\|'avg'\|'count'\|'min'\|'max'` | 聚合函数 | 传给 groupBy 使用 |
| `toChartData(groups, labelField, valueField)` | groupBy 输出；标签字段；数值字段 | `[{label, value}]` | 聚合结果 → 图表数据适配 |

**示例**
```js
import { filterRows, groupBy, toChartData } from '../assets/js/filter.js';

// 筛选 SOC 0.5~0.9 的调度记录
const rows = filterRows(storage.schedule, { soc: [0.5, 0.9] });
// 按天分组求和发电量
const byDay = groupBy(generation.actual, 'date', [{ field: 'gen_total', as: 'total', fn: 'sum' }]);
// 转图表数据
const chartData = toChartData(byDay, 'date', 'total'); // [{label:'…', value:…}]
```

### `format.js` —— 格式化

| 函数 | 入参 | 返回值 | 说明 |
|------|------|--------|------|
| `formatNumber(value, digits=0)` | 数字/字符串 | 千分位字符串 | 空值返回 `--` |
| `formatMoney(value)` | 数字/字符串 | `¥1,234.56` | 金额 |
| `formatPercent(value, digits=1)` | 0-100 或 0-1 | `87.0%` | 自动识别比例/百分数 |
| `formatDate(value)` | 日期/时间串 | `2026/8/19` | zh-CN 短日期 |

**示例**
```js
import { formatMoney, formatPercent } from '../assets/js/format.js';
formatMoney(18.4);   // "¥18.40"
formatPercent(0.91); // "91.0%"
```

---

## 数据加载

- 演示数据统一走 `common.js` 的 `Data('demo/xxx')`（导出 `Data = loadData` 函数，直接调用）→ `/data/demo/xxx.json`。
- 加载后先取 `meta`（来源/更新时间/可信等级）用于展示与溯源，再按 `data/CONTRACT.md` 的字段取数。

---

## 变更纪律

- 计算层为共享模块：**改函数签名 / 输出形态须同步 `data/CONTRACT.md` 与本文档，并通知消费方（C/D）**。
- 新增计算函数：先写单测（`assets/js/__tests__/filter.test.js` / `format.test.js`）再交付，跑 `npm test` 绿。
