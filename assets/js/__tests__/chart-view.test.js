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
});
