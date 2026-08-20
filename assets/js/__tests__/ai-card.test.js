import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAICard } from "../ai-card.js";

// 纯 DOM 组件：只需一个带 innerHTML + addEventListener 的容器，测试环境无需 jsdom
function mockEl() {
  const listeners = {};
  return {
    innerHTML: "",
    addEventListener: vi.fn((ev, fn) => { listeners[ev] = fn; }),
    removeEventListener: vi.fn((ev) => { delete listeners[ev]; }),
    _listeners: listeners,
  };
}

function click(el, value) {
  el._listeners.click({
    target: { dataset: { value }, getAttribute: (k) => (k === "data-value" ? value : null) },
  });
}

const SAMPLE = {
  conclusion: "建议明日现货比例降至 27%",
  confidence: 87,
  reasons: ["风速预测下降", "预测区间扩大", "储能余量有限"],
  model: { name: "MarketDecision", version: "1.2" },
  dataSources: [
    { source: "气象更新", time: "15:30" },
    { source: "SCADA 更新", time: "15:40" },
  ],
  actions: [
    { label: "查看依据", value: "view-evidence" },
    { label: "加入任务", value: "add-task" },
  ],
};

describe("createAICard", () => {
  let el;
  beforeEach(() => { el = mockEl(); });

  it("渲染八要素：结论/置信度/依据/模型/数据/风险/按钮", () => {
    const card = createAICard(el);
    card.setData(SAMPLE);
    const html = el.innerHTML;
    expect(html).toContain("建议明日现货比例降至 27%");
    expect(html).toContain("87%");
    expect(html).toContain("① 风速预测下降");
    expect(html).toContain("MarketDecision 1.2");
    expect(html).toContain("气象更新 15:30");
    expect(html).toContain("基于 MarketDecision 1.2 模型 · 置信度 87%");
    expect(html).toContain('data-value="add-task"');
  });

  it("缺省 riskNote 用默认模型说明", () => {
    const card = createAICard(el);
    card.setData({ conclusion: "x", confidence: 80 });
    expect(el.innerHTML).toContain("基于 MarketDecision 1.2 模型");
  });

  it("缺省 actions 渲染默认三键", () => {
    const card = createAICard(el);
    card.setData({ conclusion: "x", confidence: 80 });
    expect(el.innerHTML).toContain("查看依据");
    expect(el.innerHTML).toContain("加入任务");
    expect(el.innerHTML).toContain("重新模拟");
  });

  it("pending 默认显示待人工确认，false 隐藏", () => {
    const card = createAICard(el);
    card.setData({ conclusion: "x", confidence: 80 });
    expect(el.innerHTML).toContain("待人工确认");
    card.setData({ conclusion: "x", confidence: 80 }, { pending: false });
    expect(el.innerHTML).not.toContain("待人工确认");
  });

  it("onAction 回调带 label/value", () => {
    const card = createAICard(el);
    const onAction = vi.fn();
    card.setData(SAMPLE, { onAction });
    click(el, "add-task");
    expect(onAction).toHaveBeenCalledWith({ label: "加入任务", value: "add-task" });
  });

  it("点击未定义按钮不触发", () => {
    const card = createAICard(el);
    const onAction = vi.fn();
    card.setData(SAMPLE, { onAction });
    click(el, "unknown");
    expect(onAction).not.toHaveBeenCalled();
  });

  it("置信度越界收敛到 0-100", () => {
    const card = createAICard(el);
    card.setData({ conclusion: "x", confidence: 150 });
    expect(el.innerHTML).toContain("width:100%");
    card.setData({ conclusion: "x", confidence: -5 });
    expect(el.innerHTML).toContain("width:0%");
  });

  it("HTML 注入被转义", () => {
    const card = createAICard(el);
    card.setData({ conclusion: "<script>alert(1)</script>", confidence: 50 });
    expect(el.innerHTML).not.toContain("<script>alert(1)</script>");
    expect(el.innerHTML).toContain("&lt;script&gt;");
  });

  it("dispose 清空内容并移除监听", () => {
    const card = createAICard(el);
    card.setData(SAMPLE);
    card.dispose();
    expect(el.innerHTML).toBe("");
    expect(el.removeEventListener).toHaveBeenCalled();
  });
});
