# chart-view.js —— 统一图表展示组件接口文档

> 维护人：**B 展示岗（lcz）** · 读者：**C/D/E 页面开发者**
> 本文档是 `chart-view.js` 的**接口契约**，页面取数 / 渲染以此为准。
> 改接口须同步更新本文档，并在群里通知消费方（C/D/E）。

---

## 1. 概述

`chart-view.js` 是全场**唯一**的图表渲染入口，统一封装 ECharts 生命周期 + 数据适配。

**铁律**（AGENTS.md，违反即返工）：

- 页面**禁止**直接 `echarts.init`，只能通过 `createChart` 渲染图表。
- 数据计算（筛选 / 聚合 / 格式化）走 A 的 `filter.js` / `format.js`，页面**不自写**。
- 组件**无 DOM 依赖**，只封装逻辑；页面提供容器 `<div ref="chart">`。
- 禁止本机绝对路径；资源用 `../assets/`，数据用 `/data/`。

**配色与图例**:

- 分类系列色固定 6 色(蓝/橙/青/黄/品红/紫),按系列出现顺序分配,不循环、不用绿/红(绿红保留给充放电状态色)。色值经 CVD 色盲安全校验。
- 多系列(≥2)图表自动带图例;单系列不带。
- 图例默认**右上角**（不独占一行，节省纵向空间）；传 `options.legend: false` 可关闭。
- 系列色可覆盖：传 `options.colors: [..]`（如 p6 品牌绿色系）。
- 数值轴默认 `splitNumber: 4`（避免刻度标签重叠），可传 `options.splitNumber` 覆盖。
- 轴标签统一 12px（`applyTheme` 内置）。

---

## 2. 快速上手

最小可复制示例（照抄 `template.html` 的用法）：

```html
<div ref="chart" class="w-full h-80"></div>
```

```js
import { createChart } from '../assets/js/chart-view.js';
import { Data } from '../assets/js/common.js';
import { toChartData } from '../assets/js/filter.js';

export default {
  async mounted() {
    const rows = await Data.load('demo/xxx');            // A 的模拟数据
    this.chart = createChart(this.$refs.chart);
    this.chart.setData(toChartData(rows, 'labelField', 'valueField'), { type: 'bar' });
  },
  beforeUnmount() {
    if (this.chart) { this.chart.dispose(); this.chart = null; }
  },
};
```

> ⚠️ 图表容器 `<div ref="chart">` 必须在页面**首次渲染时就存在**（勿置于 `v-if` 条件分支内），
> 因为 `mounted` 里 `createChart($refs.chart)` 依赖它已渲染。加载态用 `loading` / `error` 变量控制。

---

## 3. API 参考

### `createChart(el)`

创建受管理的图表实例。

| 参数 | 类型          | 说明     |
|------|---------------|----------|
| `el` | `HTMLElement` | 图表容器 |

**返回**：`{ setData, dispose }`。

### `setData(data, options)`

渲染 / 更新图表。`options.type` 决定图表类型与 `data` 形状（见第 4 节）。

| 参数      | 类型              | 说明                                    |
|-----------|-------------------|-----------------------------------------|
| `data`    | `Array` / `Object`| 数据，形状由 `type` 决定                |
| `options` | `Object`          | `{ type, ...类型专属字段 }`             |

**通用 options（跨类型）**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `legend` | `boolean` | `false` 关闭图例（默认多系列显示，右上角） |
| `colors` | `string[]` | 覆盖系列色板（默认 6 色） |
| `splitNumber` | `number` | 数值轴刻度档数（默认 4） |
| `xInterval` | `number` | X 轴标签抽稀间隔（`0` 全显示，`2` 每 2 个显示 1 个） |
| `yName` | `string` | 左轴名称 |
| `yAxis2` | `Object` | 双 Y 轴：`{ name, series: [系列名] }`，命中的系列挂右轴 |

### `dispose()`

销毁实例并移除 `window.resize` 监听。**必须在 `beforeUnmount` 调用**，否则内存泄漏 + 残留监听。

---

## 4. 图表类型清单

`options.type` 共 6 种。

### 4.1 `bar` —— 柱状图

| 场景       | p6 三栏对比、p4 方案对比                                   |
|------------|-----------------------------------------------------------|
| 单系列 data | `[{label, value}]`（即 `toChartData` 输出）               |
| 多系列 data | `{labels:[], series:[{name, data:[]}]}`                    |
| options    | `stacked`（堆叠）、`horizontal`（横向）          |

```js
// 单系列
this.chart.setData([{ label: '基准', value: 100 }, { label: 'AI', value: 128 }], { type: 'bar' });

// 多系列
this.chart.setData({
  labels: ['Q1', 'Q2', 'Q3'],
  series: [
    { name: '基准', data: [100, 110, 120] },
    { name: 'AI',   data: [120, 135, 150] },
  ],
}, { type: 'bar', stacked: false });
```

### 4.2 `line` —— 折线图

| 场景       | p2 预测趋势、p4 趋势                                        |
|------------|-----------------------------------------------------------|
| 单系列 data | `[{label, value}]`                                        |
| 多系列 data | `{labels:[], series:[{name, data:[]}]}`                    |
| options    | `smooth`（平滑）、`area`（面积）、`yAxis2`（双 Y 轴）      |

双 Y 轴示例（p4 发电 vs 电价，MW 左轴 / 元右轴）：

```js
this.chart.setData({
  labels: ['00:00', '06:00', '12:00', '18:00'],
  series: [
    { name: '发电出力(MW)', data: [80, 90, 100, 60] },
    { name: '日前电价(元/MWh)', data: [350, 380, 500, 560] },
  ],
}, { type: 'line', smooth: true, yName: 'MW', yAxis2: { name: '元/MWh', series: ['日前电价(元/MWh)'] } });
```

### 4.3 `scatter` —— 散点图

| 场景    | p4 收益 - 风险地图（收益 Y / 风险 X）                       |
|---------|-----------------------------------------------------------|
| data    | `[{x, y, label}]`                                         |
| options | `xName`（X 轴名）、`yName`（Y 轴名）              |

```js
this.chart.setData([
  { x: 3, y: 120, label: '方案A 稳健' },
  { x: 5, y: 135, label: '方案B 均衡' },
  { x: 8, y: 145, label: '方案C 收益' },
], { type: 'scatter', xName: '风险', yName: '收益' });
```

### 4.4 `pie` —— 饼图

| 场景    | p2 影响因子贡献、p5 分类分布                               |
|---------|-----------------------------------------------------------|
| data    | `[{name, value}]`                                         |
| options | `donut`（环形）、`showLabel`（直接标签）、`legend: false`（关图例）、`legendRight: true`（图例右侧竖排 + 每项带数量） |

```js
this.chart.setData([
  { name: '风速', value: 42 },
  { name: '风向', value: 16 },
  { name: '温度', value: 9 },
], { type: 'pie', donut: true });
```

### 4.5 `confidence` —— 置信区间面积图

| 场景    | p2 主预测图（实际 / 预测 / 上下界 4 曲线 + 面积）          |
|---------|-----------------------------------------------------------|
| data    | `{labels:[], actual:[], forecast:[], upper:[], lower:[]}` |
| options | —（颜色由 design-system/MASTER.md 统一）                                         |

```js
this.chart.setData({
  labels:   ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
  actual:   [120, 115, 110, 125, 118, 122],
  forecast: [122, 118, 112, 128, 120, 124],
  upper:    [128, 124, 118, 134, 126, 130],
  lower:    [114, 110, 104, 120, 112, 116],
}, { type: 'confidence' });
```

### 4.6 `timeline` —— 时间轴 + 标记点

| 场景    | p3 优化时间轴（风 / 光 / 储 / 并网 / 价格多系列 + 充放电节点）|
|---------|-----------------------------------------------------------|
| data    | `{labels:[时间], series:[{name, data:[]}], marks:[{time, label, type}]}` |
| options | `mark`（是否显示标记）                                    |

`marks` 每项字段:

| 字段 | 类型 | 说明 |
|------|------|------|
| `time` | string | 标记的**时间坐标**,必须命中 `labels` 里的某个值(如 `"11:20"`) |
| `label` | string | 标记的**显示文字**(如 `"开始充电"`) |
| `type` | `'charge'`\|`'discharge'` | 决定标记颜色(绿/红)与图标 |

```js
this.chart.setData({
  labels: ['10:00', '12:00', '14:00', '16:00', '18:00', '20:00'],
  series: [
    { name: '风电', data: [80, 85, 90, 70, 60, 55] },
    { name: '光伏', data: [40, 60, 70, 45, 20, 5] },
  ],
  marks: [
    { time: '11:20', label: '开始充电', type: 'charge' },
    { time: '17:50', label: '开始放电', type: 'discharge' },
  ],
}, { type: 'timeline' });
```

---

## 5. 数据来源

| 依赖     | 文件               | 提供的接口                                                                 |
|----------|--------------------|----------------------------------------------------------------------------|
| 数据加载 | `common.js`（E 维护）| `Data.load(id)` 读 `/data/{id}.json`                                        |
| 数据计算 | `filter.js`（A 维护）| `filterRows` / `groupBy` / `toChartData`                                    |
| 格式化   | `format.js`（A 维护）| `formatNumber` / `formatMoney` / `formatPercent` / `formatDate`             |

`toChartData(groups, labelField, valueField)` 输出 `[{label, value}]`，**直接作为单系列图表的数据**：

```js
import { groupBy, toChartData } from '../assets/js/filter.js';
const groups = groupBy(rows, 'month', [{ field: 'revenue', as: 'total', fn: 'sum' }]);
this.chart.setData(toChartData(groups, 'month', 'total'), { type: 'bar' });
```

---

## 6. 生命周期

```js
mounted() {
  // 1) 创建实例（容器必须已渲染）
  this.chart = createChart(this.$refs.chart);
  // 2) 加载数据 + 渲染
  this.chart.setData(/* data */, { type: '...' });
},
beforeUnmount() {
  // 3) 必须销毁，否则内存泄漏 + 残留 resize 监听
  if (this.chart) { this.chart.dispose(); this.chart = null; }
},
```

组件内部自动监听 `window.resize` 自适应尺寸；页面**无需**手动 resize。

---

## 7. 边界与限制

**本组件不负责**（不要往 chart-view 里塞）：

- 「经营链路图」（p1）、「资源池图形」（p4）：纯 HTML/CSS + Vue 自定义组件，**非 ECharts**。
- 真实地图（map/geo）：需额外 GeoJSON（黑吉辽蒙），当前仓库无，GeoJSON 到位后由 B 迭代。

**约束**：

- 页面只传数据 + `type`，不传原始 ECharts option。
- 图表主题（配色 / 字体）由 `chart-view.js` 内置 theme 常量统一，取自 `design-system/MASTER.md` token，不在页面里硬编码颜色。
- 分类系列色上限 6 个(超过 6 个系列建议合并为「其他」或分面);散点/饼图等「全对」形式建议 ≤3 个系列(颜色两两可相邻),超过则依赖直接标签兜底。
