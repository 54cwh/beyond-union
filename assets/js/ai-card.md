# ai-card · 可信 AI 八要素卡片（接口文档）

> 维护人：**B · 展示岗（lcz）**　分支：`feature/b`　跨页复用组件
> 本文档是「可信 AI 卡片」组件的接口契约，读者是 **C/D/E**（页面开发者）与 **E**（AI 问答库提供方）。
> 铁律依据：`AGENTS.md`、`docs/需求.md` 十九节「可信 AI 机制」、`docs/技术栈定案.md`、`docs/分工说明.md`。

---

## 1. 概述

「可信 AI 卡片」是全站**跨页复用**的 AI 建议展示组件，把一条 AI 建议渲染成「可解释、可追溯、可人工确认」的卡片。
**核心原则（需求.md 十九节）：每一条 AI 建议必须包含「八要素」** ——

| # | 八要素 | 数据字段 | 说明 |
|---|--------|----------|------|
| ① | 数据来源 | `dataSources[].source` | 建议依据的数据出处 |
| ② | 数据时间 | `dataSources[].time` | 数据更新时间 |
| ③ | 模型名称 | `model.name` | 产生该建议的模型 |
| ④ | 模型版本 | `model.version` | 模型版本号 |
| ⑤ | 置信度 | `confidence` | 0–100（显示为百分比） |
| ⑥ | 推荐原因 | `reasons[]` | 逐条列出推荐依据 |
| ⑦ | 风险提示 | `riskNote` | 免责声明 |
| ⑧ | 人工确认 | `actions[]` + `pending` | 「加入任务」等人工在环入口 + 「待人工确认」徽章 |

**职责边界（铁律）**：
- ai-card **只负责渲染，不负责生成建议**——AI 建议内容由 **E 的 `ai-qa.js`（预置问答库）** 产出，页面取到建议后调 ai-card 渲染。
- **AI 为模拟**：由预置问答库 + 预置数据实现，**非真模型**（技术栈定案.md）。
- ai-card 是**纯 DOM 组件**，**不使用 ECharts**（需要图表的场景走 `chart-view.js`）。
- 页面**禁止自建 AI 卡片**——展示 AI 建议统一调 ai-card（分工说明.md「全局能力」）。

---

## 2. 快速上手

照 `template.html` 的 mounted 范式，最小可复制示例：

```js
import { createAICard } from '../assets/js/ai-card.js';

// 模板里放容器（须在首次渲染时就存在，勿置于 v-if 条件分支内）：
// <div ref="card"></div>

mounted() {
  this.card = createAICard(this.$refs.card);
  this.card.setData({
    conclusion: "建议明日现货比例降至 27%",
    confidence: 87,
    reasons: [
      "14:00—18:00 风速预测下降 18%",
      "风功率预测区间扩大",
      "储能可调能力仅 18.2 MWh",
    ],
    model: { name: "MarketDecision", version: "1.2" },
    dataSources: [
      { source: "气象更新", time: "15:30" },
      { source: "SCADA 更新", time: "15:40" },
      { source: "市场数据更新", time: "15:35" },
    ],
    actions: [
      { label: "查看依据", value: "view-evidence" },
      { label: "加入任务", value: "add-task" },
      { label: "重新模拟", value: "re-simulate" },
    ],
  }, {
    onAction: (action) => { /* 按钮点击回调，action = { label, value } */ },
  });
},
beforeUnmount() {
  if (this.card) { this.card.dispose(); this.card = null; }
},
```

---

## 3. API 参考

### `createAICard(el)`

| 参数 | 类型 | 说明 |
|------|------|------|
| `el` | `HTMLElement` | 卡片容器（`<div ref="card">`），须已渲染 |

**返回**：`{ setData, dispose }`

### `setData(data, options)`

渲染 / 更新卡片。`data` 为一条 AI 建议（字段见第 4 节），`options` 为可选配置。

### `dispose()`

清空卡片内容、移除事件监听，供 `beforeUnmount` 调用（防内存泄漏）。

### `options`

| 字段 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `onAction` | `(action) => void` | 无 | 按钮点击回调，`action = { label, value }` |
| `pending` | `boolean` | `true` | 是否显示「待人工确认」徽章（八要素⑧） |

---

## 4. 八要素字段清单

`setData` 的 `data` 对象（一条建议 = 一卡）：

| 字段 | 类型 | 必填 | 对应八要素 | 渲染位置 |
|------|------|------|-----------|---------|
| `conclusion` | `string` | ✅ | —（卡片主结论/建议）| 主标题 |
| `confidence` | `number` | ✅ | ⑤ 置信度 | 百分比 + 进度条 |
| `reasons` | `string[]` | ✅ | ⑥ 推荐原因 | 编号列表 ①②③ |
| `model` | `{ name, version }` | ✅ | ③④ 模型名称/版本 | 「模型：MarketDecision 1.2」 |
| `dataSources` | `{ source, time }[]` | ✅ | ①② 数据来源/时间 | 「数据：气象更新 15:30 · …」 |
| `riskNote` | `string` | ⬜（有默认）| ⑦ 风险提示 | 免责声明小字 |
| `actions` | `{ label, value }[]` | ⬜（有默认）| ⑧ 人工确认 | 底部按钮组 |
| `impact` | `string` | ⬜ | —（副驾驶「影响」）| 结论下一行 |
| `pending` | `boolean` | ⬜（`true`）| ⑧ 人工确认 | 状态徽章 |

**默认值**：
- `riskNote` 缺省为 `"基于 MarketDecision 1.2 模型 · 置信度 87%"`（业务化表述，替代免责声明）。
- `actions` 缺省为三键：`查看依据(view-evidence)`、`加入任务(add-task)`、`重新模拟(re-simulate)`。
- `pending` 缺省 `true`——AI 建议默认「待人工确认」，强调「AI 辅助决策、不替代经营」。

---

## 5. 数据来源（谁来填 `data`）

```
E 的 ai-qa.js（预置问答库，非真模型）
      │ 输出一条「建议」对象（含结论/置信度/依据/模型/数据/风险）
      ▼
页面（B/C/D/E）取到建议 → 调 ai-card.setData(建议) 渲染
```

- 建议内容**由 E 的 `ai-qa.js` 产出**；B 的 ai-card **只定义渲染契约**（第 4 节字段表），不定义建议内容。
- 建议里引用的数字（风速、SOC、电价等）来自 **A 的 `data/demo/*.json`**；E 的问答库文案引用这些数据。
- 若 `ai-qa.js` 尚未就绪，页面可先用**需求.md 里的示例数字内联**渲染卡片（分工说明.md 里程碑兜底方案），数据到位后再切换。

---

## 6. 生命周期

与 `chart-view.js` 同模式：

| 阶段 | 调用 | 说明 |
|------|------|------|
| `mounted` | `createAICard(this.$refs.card)` | 创建卡片 |
| 数据就绪 | `card.setData(data, options)` | 渲染建议 |
| `beforeUnmount` | `card.dispose()` | 清空 + 移除监听 |

> 容器须在页面**首次渲染时就存在**（勿置于 `v-if` 条件分支内），否则 `mounted` 里 `this.$refs.card` 为 `undefined`。

---

## 7. 边界与限制

- **不生成建议**：ai-card 是纯展示组件，不含任何「预测 / 优化 / 问答」逻辑（那是 E 的 `ai-qa.js`、A 的计算层职责）。
- **不负责溯源弹层**：「数据溯源弹层（【查看数据来源】）」是**另一个独立组件**（同为 B 维护，另行交付）；卡片上的「查看依据」按钮只是触发入口，由页面接线上溯源弹层。
- **不用 ECharts**：ai-card 是 HTML/CSS + 内联样式组件；需要图表走 `chart-view.js`。
- **视觉遵循 `design-system/MASTER.md`**：暗色底 + 绿色正向指标（Accent `#22C55E`）；样式落地在 `assets/common.css`（B 维护），卡片颜色不在页面里硬编码。
- **不替代人工**：卡片默认显示「待人工确认」徽章，呼应需求「AI 辅助决策、不替代经营」。
- **按钮行为归页面**：`actions` 里的 `value` 只作标识，点击后通过 `onAction` 回调交给页面处理（如「加入任务」跳 p5、「重新模拟」触发情景推演），ai-card 不内置跳转逻辑。
