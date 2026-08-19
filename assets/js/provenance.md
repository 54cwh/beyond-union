# provenance · 数据溯源弹层（接口文档）

> 维护人：**B · 展示岗（lcz）**　分支：`feature/b`　跨页复用组件
> 读者：C/D/E（页面开发者）。铁律依据：`docs/需求.md` 原则3、`docs/分工说明.md`。

---

## 1. 概述

数据溯源弹层负责渲染「【查看数据来源】」，展示需求.md 原则3 规定的 **7 字段**。任何指标/建议均可点【查看数据来源】触发，跨页复用。

**职责边界**：只展示溯源信息，**不生成溯源数据**（数据由 A 的数据血缘/模型档案提供，页面组装后传入）；纯 DOM 组件，不用 ECharts。

---

## 2. 快速上手

```js
import { createProvenance } from '../assets/js/provenance.js';
// 模板放容器：<div ref="provenance"></div>

mounted() {
  this.prov = createProvenance(this.$refs.provenance);
},
beforeUnmount() {
  if (this.prov) this.prov.dispose();
},
methods: {
  showSource(data) { this.prov.open(data); },
},
```

---

## 3. API 参考

| 方法 | 说明 |
|------|------|
| `createProvenance(el)` | 创建弹层，`el` 为挂载容器（`<div ref="provenance">`），返回 `{ open, close, dispose }` |
| `open(data)` | 渲染溯源弹层 |
| `close()` | 关闭（清空内容） |
| `dispose()` | 销毁（移除监听 + 清空），供 `beforeUnmount` 调用 |

关闭交互：点右上角关闭按钮，或点弹层外的半透明背景。

---

## 4. data 字段（7 字段，需求.md 原则3）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | `string` | ✅ | 数据名称 |
| `sources` | `string[]` | ⬜ | 数据来源（可多个，用 `+` 连接） |
| `updateTime` | `string` | ⬜ | 更新时间 |
| `quality` | `string` | ⬜ | 数据质量 |
| `raw` | `string` | ⬜ | 原始数据 |
| `process` | `string` | ⬜ | 处理方法 |
| `model` | `{ name, version }` | ⬜ | 模型版本 |

缺省字段自动不渲染对应行。

---

## 5. 边界与限制

- 只展示，不生成溯源数据（数据来源归 A 的数据血缘/模型档案）。
- 纯 DOM + 内联样式（token 来自 `design-system/MASTER.md`），样式落地 `assets/common.css`。
- 不用 ECharts；需要图表走 `chart-view.js`。
- 与 `ai-card.js` 配套：ai-card 的「查看依据」按钮由页面接线上本弹层。
