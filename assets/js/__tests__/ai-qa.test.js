import { describe, it, expect } from "vitest";
import { askAI, SUGGESTIONS } from "../ai-qa.js";

describe("ai-qa 问答库", () => {
  it("现货关键词命中现货规则", () => {
    const a = askAI("为什么建议降低明日现货比例");
    expect(a.conclusion).toContain("现货");
    expect(a.confidence).toBeGreaterThan(0);
    expect(a.reasons.length).toBeGreaterThan(0);
    expect(a.model.name).toBeTruthy();
    expect(a.dataSources.length).toBeGreaterThan(0);
  });

  it("储能关键词命中储能规则", () => {
    const a = askAI("今天储能建议什么时候充电");
    expect(a.conclusion).toContain("充电");
    expect(a.actions.length).toBeGreaterThan(0);
  });

  it("政策关键词命中政策规则", () => {
    const a = askAI("吉林有哪些现货交易规则");
    expect(a.conclusion).toContain("吉林");
    expect(a.conclusion).toContain("现货");
  });

  it("预测关键词命中预测规则", () => {
    const a = askAI("明天发电预测多少");
    expect(a.conclusion).toContain("142.3");
    expect(a.model.name).toBe("WindForecast");
  });

  it("未知问题返回兜底", () => {
    const a = askAI("今天天气怎么样");
    expect(a.conclusion).toContain("可以帮您");
  });

  it("空输入返回兜底", () => {
    expect(askAI("").conclusion).toContain("可以帮您");
  });

  it("快捷提问建议非空", () => {
    expect(SUGGESTIONS.length).toBeGreaterThan(0);
    expect(SUGGESTIONS[0]).toContain("现货");
  });
});
