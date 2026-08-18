import { describe, it, expect } from "vitest";
import { formatNumber, formatMoney, formatPercent, formatDate } from "../format.js";

describe("formatNumber", () => {
  it("千分位", () => {
    expect(formatNumber(1234567)).toBe("1,234,567");
  });
  it("小数位", () => {
    expect(formatNumber(1234.5, 2)).toBe("1,234.50");
  });
  it("空值", () => {
    expect(formatNumber(null)).toBe("--");
    expect(formatNumber("")).toBe("--");
    expect(formatNumber("abc")).toBe("--");
  });
});

describe("formatMoney", () => {
  it("人民币", () => {
    expect(formatMoney(1234.5)).toBe("¥1,234.50");
  });
  it("空值", () => {
    expect(formatMoney(null)).toBe("--");
  });
});

describe("formatPercent", () => {
  it("0-100 值", () => {
    expect(formatPercent(50)).toBe("50.0%");
  });
  it("0-1 值自动放大", () => {
    expect(formatPercent(0.5)).toBe("50.0%");
  });
  it("空值", () => {
    expect(formatPercent(null)).toBe("--");
  });
});

describe("formatDate", () => {
  it("Date 对象", () => {
    expect(formatDate(new Date(2024, 0, 15))).toBe("2024/1/15");
  });
  it("空值", () => {
    expect(formatDate("")).toBe("--");
    expect(formatDate("invalid")).toBe("--");
  });
});
