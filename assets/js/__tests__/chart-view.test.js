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
      marks: [{ time: "11:20", label: "开始充电", type: "charge" }],
    }, { type: "timeline" });
    const call = chart.setOption.mock.calls[0][0];
    expect(call.series[0].markLine.data[0].xAxis).toBe("11:20");
    expect(call.series[0].markLine.data[0].name).toBe("开始充电");
    expect(call.series[0].markLine.data[0].label.formatter).toBe("充电");
  });
});

describe("浅色主题（v3 设计语言）", () => {
  let chart;
  beforeEach(() => {
    chart = mockEcharts();
    listeners.resize = undefined;
  });

  it("套用白底浅色主题（文字/轴线/提示框）", () => {
    const c = createChart({});
    c.setData([{ label: "A", value: 1 }]);
    const call = chart.setOption.mock.calls[0][0];
    expect(call.textStyle.color).toBe("#1A1A1A");
    expect(call.xAxis.axisLabel.color).toBe("#1A1A1A");
    expect(call.xAxis.axisLine.lineStyle.color).toBe("#9CA3AF");
    expect(call.tooltip.backgroundColor).toBe("#FFFFFF");
  });
});

describe("分类配色与图例", () => {
  let chart;
  beforeEach(() => {
    chart = mockEcharts();
    listeners.resize = undefined;
  });

  it("套用固定分类调色板", () => {
    const c = createChart({});
    c.setData([{ label: "A", value: 1 }]);
    const call = chart.setOption.mock.calls[0][0];
    expect(call.color).toEqual(["#2563eb", "#d95926", "#0d9488", "#ca8a04", "#db2777", "#7c3aed"]);
  });

  it("多系列柱状图带图例", () => {
    const c = createChart({});
    c.setData({
      labels: ["Q1", "Q2"],
      series: [{ name: "基准", data: [100, 110] }, { name: "AI", data: [120, 130] }],
    }, { type: "bar" });
    const call = chart.setOption.mock.calls[0][0];
    expect(call.legend.data).toEqual(["基准", "AI"]);
  });

  it("单系列柱状图不带图例", () => {
    const c = createChart({});
    c.setData([{ label: "A", value: 1 }]);
    const call = chart.setOption.mock.calls[0][0];
    expect(call.legend).toBeUndefined();
  });

  it("置信区间图带图例(仅预测/实际)", () => {
    const c = createChart({});
    c.setData({
      labels: ["00:00", "04:00"],
      actual: [120, 115],
      forecast: [122, 118],
      upper: [128, 124],
      lower: [114, 110],
    }, { type: "confidence" });
    const call = chart.setOption.mock.calls[0][0];
    expect(call.legend.data).toEqual(["预测", "实际"]);
  });

  it("饼图带图例(切片名)", () => {
    const c = createChart({});
    c.setData([{ name: "风速", value: 42 }, { name: "风向", value: 16 }], { type: "pie" });
    const call = chart.setOption.mock.calls[0][0];
    expect(call.legend.data).toEqual(["风速", "风向"]);
  });

  it("时间轴多系列带图例", () => {
    const c = createChart({});
    c.setData({
      labels: ["10:00", "12:00"],
      series: [{ name: "风电", data: [80, 85] }, { name: "光伏", data: [40, 60] }],
    }, { type: "timeline" });
    const call = chart.setOption.mock.calls[0][0];
    expect(call.legend.data).toEqual(["风电", "光伏"]);
  });
});

// —— 新增：选项开关 ——
describe("选项开关", () => {
  let chart;
  beforeEach(() => {
    chart = mockEcharts();
    listeners.resize = undefined;
  });

  it("bar 堆叠：每个系列 stack 为 total", () => {
    const c = createChart({});
    c.setData({
      labels: ["Q1", "Q2"],
      series: [{ name: "基准", data: [100, 110] }, { name: "AI", data: [120, 130] }],
    }, { type: "bar", stacked: true });
    const call = chart.setOption.mock.calls[0][0];
    expect(call.series[0].stack).toBe("total");
    expect(call.series[1].stack).toBe("total");
  });

  it("bar 横向：xAxis 为 value、yAxis 为 category 且含 labels", () => {
    const c = createChart({});
    c.setData([{ label: "A", value: 1 }, { label: "B", value: 2 }], { type: "bar", horizontal: true });
    const call = chart.setOption.mock.calls[0][0];
    expect(call.xAxis.type).toBe("value");
    expect(call.yAxis.type).toBe("category");
    expect(call.yAxis.data).toEqual(["A", "B"]);
  });

  it("line 面积：series[0].areaStyle 存在", () => {
    const c = createChart({});
    c.setData([{ label: "A", value: 1 }], { type: "line", area: true });
    const call = chart.setOption.mock.calls[0][0];
    expect(call.series[0].areaStyle).toBeTypeOf("object");
  });

  it("line 默认：xAxis.boundaryGap 为 false", () => {
    const c = createChart({});
    c.setData([{ label: "A", value: 1 }], { type: "line" });
    const call = chart.setOption.mock.calls[0][0];
    expect(call.xAxis.boundaryGap).toBe(false);
  });

  it("pie 隐藏标签：series[0].label.show 为 false", () => {
    const c = createChart({});
    c.setData([{ name: "风速", value: 42 }], { type: "pie", showLabel: false });
    const call = chart.setOption.mock.calls[0][0];
    expect(call.series[0].label.show).toBe(false);
  });

  it("timeline 关标记：series[0].markLine 为 undefined 且正常渲染", () => {
    const c = createChart({});
    c.setData({
      labels: ["10:00", "12:00"],
      series: [{ name: "风电", data: [80, 85] }],
      marks: [{ time: "11:20", label: "开始充电", type: "charge" }],
    }, { type: "timeline", mark: false });
    expect(chart.setOption).toHaveBeenCalledTimes(1);
    const call = chart.setOption.mock.calls[0][0];
    expect(call.series[0].markLine).toBeUndefined();
  });

  it("未知 type 回落到 bar", () => {
    const c = createChart({});
    c.setData([{ label: "A", value: 1 }], { type: "xxx" });
    const call = chart.setOption.mock.calls[0][0];
    expect(call.series[0].type).toBe("bar");
  });
});

// —— 新增：边界情况 ——
describe("边界情况", () => {
  let chart;
  beforeEach(() => {
    chart = mockEcharts();
    listeners.resize = undefined;
  });

  it("空数据 setData([]) 不崩，series[0].data 为空数组", () => {
    const c = createChart({});
    expect(() => c.setData([])).not.toThrow();
    const call = chart.setOption.mock.calls[0][0];
    expect(call.series[0].data).toEqual([]);
  });

  it("缺字段 setData({}) 不崩，xAxis.data 与 series 均为空数组", () => {
    const c = createChart({});
    expect(() => c.setData({})).not.toThrow();
    const call = chart.setOption.mock.calls[0][0];
    expect(call.xAxis.data).toEqual([]);
    expect(call.series).toEqual([]);
  });

  it("连续两次 setData（bar→line）调用 2 次 setOption，最后一次为 line", () => {
    const c = createChart({});
    c.setData([{ label: "A", value: 1 }], { type: "bar" });
    c.setData([{ label: "A", value: 1 }], { type: "line" });
    expect(chart.setOption).toHaveBeenCalledTimes(2);
    const call = chart.setOption.mock.calls[1][0];
    expect(call.series[0].type).toBe("line");
  });
});

// —— 新增：浅色主题（跨类型，v3 设计语言白底黑字） ——
describe("浅色主题（跨类型）", () => {
  let chart;
  beforeEach(() => {
    chart = mockEcharts();
    listeners.resize = undefined;
  });

  it("散点图 textStyle.color 为 #1A1A1A", () => {
    const c = createChart({});
    c.setData([{ x: 3, y: 120, label: "方案A" }], { type: "scatter" });
    const call = chart.setOption.mock.calls[0][0];
    expect(call.textStyle.color).toBe("#1A1A1A");
  });

  it("饼图 textStyle.color 为 #1A1A1A", () => {
    const c = createChart({});
    c.setData([{ name: "风速", value: 42 }], { type: "pie" });
    const call = chart.setOption.mock.calls[0][0];
    expect(call.textStyle.color).toBe("#1A1A1A");
  });

  it("置信区间图 textStyle.color 为 #1A1A1A", () => {
    const c = createChart({});
    c.setData({
      labels: ["00:00", "04:00"],
      actual: [120, 115],
      forecast: [122, 118],
      upper: [128, 124],
      lower: [114, 110],
    }, { type: "confidence" });
    const call = chart.setOption.mock.calls[0][0];
    expect(call.textStyle.color).toBe("#1A1A1A");
  });

  it("时间轴图 textStyle.color 为 #1A1A1A", () => {
    const c = createChart({});
    c.setData({
      labels: ["10:00", "12:00"],
      series: [{ name: "风电", data: [80, 85] }],
    }, { type: "timeline" });
    const call = chart.setOption.mock.calls[0][0];
    expect(call.textStyle.color).toBe("#1A1A1A");
  });
});
