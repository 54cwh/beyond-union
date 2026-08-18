import { describe, it, expect } from "vitest";
import { filterRows, groupBy, aggregateFn, toChartData } from "../filter.js";

const data = [
  { year: 2020, region: "华东", amount: 100, category: "A" },
  { year: 2020, region: "华北", amount: 200, category: "B" },
  { year: 2021, region: "华东", amount: 300, category: "A" },
  { year: 2021, region: "华东", amount: 50, category: "C" },
];

describe("filterRows", () => {
  it("精确匹配字符串条件", () => {
    const out = filterRows(data, { year: 2020 });
    expect(out).toHaveLength(2);
  });

  it("数字区间条件", () => {
    const out = filterRows(data, { amount: [150, 250] });
    expect(out).toHaveLength(1);
    expect(out[0].amount).toBe(200);
  });

  it("空条件不过滤", () => {
    expect(filterRows(data, {})).toHaveLength(4);
  });

  it("多条件组合", () => {
    const out = filterRows(data, { region: "华东", amount: [100, 300] });
    expect(out).toHaveLength(2);
  });
});

describe("groupBy", () => {
  it("单维度求和", () => {
    const out = groupBy(data, "year", [{ field: "amount", as: "total", fn: "sum" }]);
    expect(out).toHaveLength(2);
    const y2020 = out.find((r) => r.year === 2020);
    expect(y2020.total).toBe(300);
    expect(y2020.__count).toBe(2);
  });

  it("多维度分组", () => {
    const out = groupBy(data, ["year", "region"], [{ field: "amount", as: "total", fn: "sum" }]);
    expect(out).toHaveLength(3);
  });
});

describe("aggregateFn", () => {
  it("sum / avg / min / max / count", () => {
    expect(aggregateFn("sum")(data, "amount")).toBe(650);
    expect(aggregateFn("avg")(data, "amount")).toBe(162.5);
    expect(aggregateFn("min")(data, "amount")).toBe(50);
    expect(aggregateFn("max")(data, "amount")).toBe(300);
    expect(aggregateFn("count")(data)).toBe(4);
  });

  it("未知函数回退 count", () => {
    expect(aggregateFn("nope")(data)).toBe(4);
  });
});

describe("toChartData", () => {
  const groups = groupBy(data, "year", [{ field: "amount", as: "total", fn: "sum" }]);

  it("映射为 [{label, value}]", () => {
    const out = toChartData(groups, "year", "total");
    expect(out).toEqual([
      { label: 2020, value: 300 },
      { label: 2021, value: 350 },
    ]);
  });

  it("缺失值回退 0", () => {
    const out = toChartData(groups, "year", "nope");
    expect(out.every((d) => d.value === 0)).toBe(true);
  });
});
