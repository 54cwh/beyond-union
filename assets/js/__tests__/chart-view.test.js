import { describe, it, expect, vi, beforeEach } from "vitest";
import { createChart } from "../chart-view.js";

// mock echarts 全局（chart-view 依赖 window.echarts）
function mockEcharts() {
  const chart = {
    setOption: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn(),
  };
  globalThis.echarts = { init: vi.fn(() => chart) };
  return chart;
}

// mock window（chart-view 用 window.addEventListener / window.echarts）
const listeners = {};
const addListener = vi.fn((ev, fn) => { listeners[ev] = fn; });
const removeListener = vi.fn((ev) => { delete listeners[ev]; });
globalThis.window = globalThis;
globalThis.addEventListener = addListener;
globalThis.removeEventListener = removeListener;

describe("createChart", () => {
  let chart;
  beforeEach(() => {
    chart = mockEcharts();
    listeners.resize = undefined;
  });

  // —— 已有契约（保持向后兼容）——
  it("初始化时挂 resize 监听", () => {
    createChart({});
    expect(listeners.resize).toBeTypeOf("function");
  });

  it("setData 单系列柱状图", () => {
    const c = createChart({});
    c.setData([{ label: "A", value: 1 }, { label: "B", value: 2 }]);
    const call = chart.setOption.mock.calls[0][0];
    expect(call.xAxis.data).toEqual(["A", "B"]);
    expect(call.series[0].data).toEqual([1, 2]);
    expect(call.series[0].type).toBe("bar");
  });

  it("setData 折线图可覆盖", () => {
    const c = createChart({});
    c.setData([{ label: "A", value: 1 }], { type: "line" });
    const call = chart.setOption.mock.calls[0][0];
    expect(call.series[0].type).toBe("line");
  });

  it("dispose 移除监听并销毁实例", () => {
    const c = createChart({});
    c.dispose();
    expect(listeners.resize).toBeUndefined();
    expect(chart.dispose).toHaveBeenCalled();
  });

  // —— 新增：6 类图表 ——
  it("setData 多系列柱状图", () => {
    const c = createChart({});
    c.setData({
      labels: ["Q1", "Q2"],
      series: [{ name: "基准", data: [100, 110] }, { name: "AI", data: [120, 130] }],
    }, { type: "bar" });
    const call = chart.setOption.mock.calls[0][0];
    expect(call.xAxis.data).toEqual(["Q1", "Q2"]);
    expect(call.series.length).toBe(2);
    expect(call.series[0].type).toBe("bar");
    expect(call.series[1].data).toEqual([120, 130]);
  });

  it("setData 多系列折线图", () => {
    const c = createChart({});
    c.setData({
      labels: ["1月", "2月"],
      series: [{ name: "发电", data: [100, 120] }],
    }, { type: "line", smooth: true });
    const call = chart.setOption.mock.calls[0][0];
    expect(call.series[0].type).toBe("line");
    expect(call.series[0].smooth).toBe(true);
  });

  it("setData 散点图", () => {
    const c = createChart({});
    c.setData([{ x: 3, y: 120, label: "方案A" }], { type: "scatter", xName: "风险", yName: "收益" });
    const call = chart.setOption.mock.calls[0][0];
    expect(call.series[0].type).toBe("scatter");
    expect(call.series[0].data[0].value).toEqual([3, 120]);
    expect(call.xAxis.name).toBe("风险");
    expect(call.yAxis.name).toBe("收益");
  });

  it("setData 饼图（环形）", () => {
    const c = createChart({});
    c.setData([{ name: "风速", value: 42 }], { type: "pie", donut: true });
    const call = chart.setOption.mock.calls[0][0];
    expect(call.series[0].type).toBe("pie");
    expect(call.series[0].data[0]).toEqual({ name: "风速", value: 42 });
    expect(call.series[0].radius).toEqual(["40%", "70%"]);
  });

  it("setData 置信区间面积图", () => {
    const c = createChart({});
    c.setData({
      labels: ["00:00", "04:00"],
      actual: [120, 115],
      forecast: [122, 118],
      upper: [128, 124],
      lower: [114, 110],
    }, { type: "confidence" });
    const call = chart.setOption.mock.calls[0][0];
    expect(call.series.length).toBe(4);
    expect(call.series[0].stack).toBe("ci");
    expect(call.series[3].data).toEqual([120, 115]);
  });

  it("setData 时间轴含充放电标记", () => {
    const c = createChart({});
    c.setData({
      labels: ["10:00", "12:00"],
      series: [{ name: "风电", data: [80, 85] }],
      marks: [{ label: "11:20 开始充电", type: "charge" }],
    }, { type: "timeline" });
    const call = chart.setOption.mock.calls[0][0];
    expect(call.series[0].markLine.data[0].name).toBe("11:20 开始充电");
    expect(call.series[0].markLine.data[0].label.formatter).toBe("充电");
  });
});

describe("暗色主题", () => {
  let chart;
  beforeEach(() => {
    chart = mockEcharts();
    listeners.resize = undefined;
  });

  it("套用 MASTER.md 主题（文字/轴线/提示框）", () => {
    const c = createChart({});
    c.setData([{ label: "A", value: 1 }]);
    const call = chart.setOption.mock.calls[0][0];
    expect(call.textStyle.color).toBe("#F8FAFC");
    expect(call.xAxis.axisLabel.color).toBe("#F8FAFC");
    expect(call.xAxis.axisLine.lineStyle.color).toBe("#334155");
    expect(call.tooltip.backgroundColor).toBe("#1E293B");
  });
});
