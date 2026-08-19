import { describe, it, expect, vi, beforeEach } from "vitest";
import { createProvenance } from "../provenance.js";

// 纯 DOM 组件：mock el（innerHTML + addEventListener），node 环境无需 jsdom
function mockEl() {
  const listeners = {};
  return {
    innerHTML: "",
    addEventListener: vi.fn((ev, fn) => { listeners[ev] = fn; }),
    removeEventListener: vi.fn((ev) => { delete listeners[ev]; }),
    _listeners: listeners,
  };
}

function click(el, target) {
  el._listeners.click({ target });
}

const SAMPLE = {
  name: "明日预测发电 142.3 MWh",
  sources: ["气象 API", "历史 SCADA"],
  updateTime: "15:40",
  quality: "99.2%",
  raw: "142.3 MWh",
  process: "数据清洗 → WindForecast-v1.4 推算",
  model: { name: "WindForecast", version: "1.4" },
};

describe("createProvenance", () => {
  let el;
  beforeEach(() => { el = mockEl(); });

  it("open 渲染原则3 七字段", () => {
    const prov = createProvenance(el);
    prov.open(SAMPLE);
    const html = el.innerHTML;
    expect(html).toContain("明日预测发电 142.3 MWh");
    expect(html).toContain("气象 API + 历史 SCADA");
    expect(html).toContain("15:40");
    expect(html).toContain("99.2%");
    expect(html).toContain("数据清洗");
    expect(html).toContain("WindForecast 1.4");
  });

  it("缺省字段不渲染空行", () => {
    const prov = createProvenance(el);
    prov.open({ name: "仅名称" });
    expect(el.innerHTML).toContain("仅名称");
    expect(el.innerHTML).not.toContain("数据质量");
    expect(el.innerHTML).not.toContain("模型版本");
  });

  it("点击关闭按钮触发 close", () => {
    const prov = createProvenance(el);
    prov.open(SAMPLE);
    click(el, { dataset: { action: "close" }, classList: { contains: () => false } });
    expect(el.innerHTML).toBe("");
  });

  it("点击背景触发 close", () => {
    const prov = createProvenance(el);
    prov.open(SAMPLE);
    click(el, { dataset: {}, classList: { contains: (c) => c === "provenance-overlay" } });
    expect(el.innerHTML).toBe("");
  });

  it("点击弹层内部不关闭", () => {
    const prov = createProvenance(el);
    prov.open(SAMPLE);
    click(el, { dataset: {}, classList: { contains: () => false } });
    expect(el.innerHTML).toContain("明日预测发电 142.3 MWh");
  });

  it("HTML 注入被转义", () => {
    const prov = createProvenance(el);
    prov.open({ name: "<script>alert(1)</script>" });
    expect(el.innerHTML).not.toContain("<script>alert(1)</script>");
    expect(el.innerHTML).toContain("&lt;script&gt;");
  });

  it("dispose 清空并移除监听", () => {
    const prov = createProvenance(el);
    prov.open(SAMPLE);
    prov.dispose();
    expect(el.innerHTML).toBe("");
    expect(el.removeEventListener).toHaveBeenCalled();
  });
});
