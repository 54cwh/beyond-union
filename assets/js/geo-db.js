// geo-db.js —— 地理信息数据库查询模块（B 展示岗维护）
// 职责：封装 data/geo/*.json（省份 / 场站 / 输电流向）的加载与查询，页面不直接操作原始 JSON。
// 数据契约：见 data/geo/README.md。
// 规则：无 DOM、无状态；纯函数（与 filter.js 同风格）；聚合复用 filter.js 的 groupBy。
// 用法：
//   const db = await loadGeoDB();      // 拉取全部地理数据
//   db.stationsByProvince("吉林");       // 省份 → 场站
//   db.resolveFlows();                  // 流向 → 起终点坐标（供 geo-map 使用）

import { groupBy } from "./filter.js";

const PROVINCE_SHORT = {
  "黑龙江省": "黑龙江",
  "吉林省": "吉林",
  "辽宁省": "辽宁",
  "内蒙古自治区": "内蒙古",
};
const STATION_TYPE_LABEL = { wind: "风电", solar: "光伏", storage: "储能" };
const KPI_LABEL = { capacity: "装机容量", generation: "今日发电", revenue: "经营收益", risk: "风险" };
const RESOURCE_LABEL = { wind: "平均风速", solar: "太阳能辐射" };

export const PROVINCES = Object.values(PROVINCE_SHORT);
export function stationTypeLabel(type) { return STATION_TYPE_LABEL[type] || type; }
export function kpiLabel(key) { return KPI_LABEL[key] || key; }
export function resourceLabel(key) { return RESOURCE_LABEL[key] || key; }
export function provinceShort(name) { return PROVINCE_SHORT[name] || name; }

export function provinceByName(list, name) {
  return list.find((p) => p.name === name || p.short === name) || null;
}

export function stationsByProvince(list, name) {
  return list.filter((s) => s.province === name || PROVINCE_SHORT[s.province] === name);
}

export function stationsByType(list, type) {
  return list.filter((s) => s.type === type);
}

export function searchStations(list, keyword) {
  const kw = String(keyword || "").trim().toLowerCase();
  if (!kw) return list;
  return list.filter((s) =>
    s.name.toLowerCase().includes(kw) ||
    s.city.toLowerCase().includes(kw) ||
    s.province.includes(kw) ||
    s.type.includes(kw)
  );
}

// 按省份聚合场站（复用 filter.js 的 groupBy）：容量合计、场站数
export function stationsByProvinceTotals(list, provinces) {
  const groups = groupBy(
    list,
    "province",
    [{ field: "capacity", fn: "sum", as: "totalCapacity" }]
  );
  const byShort = Object.create(null);
  for (const g of groups) {
    byShort[PROVINCE_SHORT[g.province] || g.province] = {
      province: g.province,
      totalCapacity: Math.round(g.totalCapacity * 10) / 10,
      stationCount: g.__count,
    };
  }
  return provinces.map((p) => byShort[p.short] || { province: p.name, totalCapacity: 0, stationCount: 0 });
}

// 流向解析：from/to 短名 → 起终点坐标（toCoord 显式则优先）
export function resolveFlows(flows, provinces) {
  return flows.map((f) => {
    const fromP = provinceByName(provinces, f.from);
    const toP = provinceByName(provinces, f.to);
    return {
      ...f,
      fromCoord: fromP ? fromP.center : null,
      toCoord: f.toCoord || (toP ? toP.center : null),
    };
  });
}

// 一次性拉取并索引全部地理数据（fetchImpl 可注入便于单测）
export async function loadGeoDB(fetchImpl, baseUrl) {
  const base = baseUrl || "";
  const load = fetchImpl || window.fetch;
  const [geoJson, provinces, stations, flows, riversData] = await Promise.all([
    load(base + "data/geo/ne.json").then((r) => r.json()),
    load(base + "data/geo/provinces.json").then((r) => r.json()),
    load(base + "data/geo/stations.json").then((r) => r.json()),
    load(base + "data/geo/flows.json").then((r) => r.json()),
    load(base + "data/geo/rivers.json").then((r) => r.json()),
  ]);
  const pList = provinces.provinces;
  const periods = provinces.periods || [];
  const sList = stations.stations;
  const fList = flows.flows;
  const rList = (riversData && riversData.rivers) || [];
  return {
    geoJson,
    provinces: pList,
    stations: sList,
    flows: fList,
    rivers: rList,
    stationsByProvince: (name) => stationsByProvince(sList, name),
    stationsByType: (type) => stationsByType(sList, type),
    searchStations: (kw) => searchStations(sList, kw),
    stationTotals: () => stationsByProvinceTotals(sList, pList),
    resolveFlows: () => resolveFlows(fList, pList),
    provinceByName: (name) => provinceByName(pList, name),
    periods: periods,
  };
}
