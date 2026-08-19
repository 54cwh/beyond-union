import { describe, it, expect } from "vitest";
import {
  provinceByName,
  stationsByProvince,
  stationsByType,
  searchStations,
  stationsByProvinceTotals,
  resolveFlows,
  stationTypeLabel,
  kpiLabel,
  resourceLabel,
  provinceShort,
  loadGeoDB,
} from "../geo-db.js";

const provinces = [
  { name: "黑龙江省", short: "黑龙江", center: [126.6, 45.8], capacity: 2.1, generation: 96, revenue: 52, risk: "低" },
  { name: "吉林省", short: "吉林", center: [125.3, 43.9], capacity: 1.8, generation: 81, revenue: 41, risk: "中低" },
  { name: "辽宁省", short: "辽宁", center: [123.4, 41.8], capacity: 2.5, generation: 118, revenue: 63, risk: "中" },
];

const stations = [
  { id: "s1", name: "黑龙江风电一厂", type: "wind", province: "黑龙江省", city: "哈尔滨", capacity: 0.8, status: "运行", model: "GW150" },
  { id: "s2", name: "黑龙江光伏一厂", type: "solar", province: "黑龙江省", city: "大庆", capacity: 0.5, status: "运行", model: "LP210" },
  { id: "s3", name: "吉林风电二厂", type: "wind", province: "吉林省", city: "白城", capacity: 0.6, status: "检修", model: "GW150" },
  { id: "s4", name: "辽宁储能站", type: "storage", province: "辽宁省", city: "大连", capacity: 0.3, status: "运行", model: "ES200" },
];

describe("provinceByName", () => {
  it("按全名命中", () => {
    expect(provinceByName(provinces, "吉林省").short).toBe("吉林");
  });
  it("按短名命中", () => {
    expect(provinceByName(provinces, "辽宁").capacity).toBe(2.5);
  });
  it("未命中返回 null", () => {
    expect(provinceByName(provinces, "不存在")).toBeNull();
  });
});

describe("stationsByProvince", () => {
  it("按全名筛选", () => {
    const out = stationsByProvince(stations, "黑龙江省");
    expect(out).toHaveLength(2);
    expect(out.every((s) => s.type !== "storage")).toBe(true);
  });
  it("按短名筛选", () => {
    expect(stationsByProvince(stations, "吉林")).toHaveLength(1);
  });
});

describe("stationsByType", () => {
  it("按类型筛选", () => {
    expect(stationsByType(stations, "wind")).toHaveLength(2);
    expect(stationsByType(stations, "storage")[0].name).toContain("辽宁");
  });
});

describe("searchStations", () => {
  it("空关键词返回全部", () => {
    expect(searchStations(stations, "")).toHaveLength(4);
  });
  it("按名称模糊匹配", () => {
    const out = searchStations(stations, "风电");
    expect(out).toHaveLength(2);
  });
  it("按城市匹配", () => {
    expect(searchStations(stations, "大连")[0].id).toBe("s4");
  });
  it("大小写不敏感", () => {
    expect(searchStations(stations, "WIND")).toHaveLength(2);
  });
});

describe("stationsByProvinceTotals", () => {
  it("汇总各省容量与场站数", () => {
    const out = stationsByProvinceTotals(stations, provinces);
    const hl = out.find((p) => p.province === "黑龙江省");
    expect(hl.totalCapacity).toBe(1.3);
    expect(hl.stationCount).toBe(2);
    expect(out).toHaveLength(3);
  });
  it("无场站省份补零", () => {
    const out = stationsByProvinceTotals([], provinces);
    expect(out.every((p) => p.totalCapacity === 0 && p.stationCount === 0)).toBe(true);
  });
});

describe("resolveFlows", () => {
  const flows = [
    { id: "f1", from: "黑龙江", to: "辽宁", label: "风电外送", value: 320 },
    { id: "f2", from: "吉林", to: "黑龙江", label: "互济", value: 180, toCoord: [126.6, 45.8] },
  ];
  it("解析起终点坐标（toCoord 显式优先）", () => {
    const out = resolveFlows(flows, provinces);
    expect(out[0].fromCoord).toEqual([126.6, 45.8]);
    expect(out[1].toCoord).toEqual([126.6, 45.8]);
  });
  it("未命中的流向坐标为空", () => {
    const out = resolveFlows([{ id: "f9", from: "未知", to: "辽宁" }], provinces);
    expect(out[0].fromCoord).toBeNull();
    expect(out[0].toCoord).toEqual([123.4, 41.8]);
  });
});

describe("标签映射", () => {
  it("stationTypeLabel / kpiLabel / resourceLabel", () => {
    expect(stationTypeLabel("wind")).toBe("风电");
    expect(stationTypeLabel("storage")).toBe("储能");
    expect(kpiLabel("capacity")).toBe("装机容量");
    expect(resourceLabel("solar")).toBe("太阳能辐射");
  });
  it("provinceShort 长短名归一", () => {
    expect(provinceShort("吉林省")).toBe("吉林");
    expect(provinceShort("吉林")).toBe("吉林");
  });
});

describe("loadGeoDB", () => {
  it("注入 fetch 拉取四份 JSON 并暴露查询方法", async () => {
    const fetchImpl = async (url) => ({
      json: async () => {
        if (url.includes("ne.json")) return { type: "FeatureCollection" };
        if (url.includes("provinces.json")) return { provinces };
        if (url.includes("stations.json")) return { stations };
        return { flows: [] };
      },
    });
    const db = await loadGeoDB(fetchImpl, "base/");
    expect(db.provinces).toHaveLength(3);
    expect(db.stations).toHaveLength(4);
    expect(db.stationsByProvince("黑龙江")).toHaveLength(2);
    expect(db.stationTotals().find((p) => p.province === "黑龙江省").totalCapacity).toBe(1.3);
  });
});
