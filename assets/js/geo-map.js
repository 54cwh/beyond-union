// geo-map.js —— 东北区域经营地图组件（ECharts，B 展示岗维护）
// 职责：注册东北四省 GeoJSON，渲染四类图层（省份KPI着色 / 资源图层 / 场站分布 / 输电流向），
//       提供图层与指标切换、省份/场站点击回调。
// 依赖：全局 echarts（页面 <script src> 引入）；数据与聚合来自 geo-db.js / filter.js。
// 规则：只封装 echarts 生命周期与配置；页面提供容器 <div ref="geoMap">。
// 用法：
//   const gm = createGeoMap(el, { geoJson, provinces, stations, flows });
//   gm.init();
//   gm.setLayer("station");       // kpi | resource | station | flow
//   gm.setKPI("revenue");         // capacity | generation | revenue | risk
//   gm.setResource("solar");      // wind | solar
//   gm.bindClick((e) => ...);     // { kind: "province"|"station", name, meta }

import { kpiLabel, resourceLabel, stationTypeLabel, resolveFlows } from "./geo-db.js";

// 浅色主题（design-system/MASTER.md 绿色 ramp；KPI 色带为单色序，L 单调递增）
const THEME = {
  surface: "#F8FAFC",
  border: "#BBF7D0",
  borderHover: "#22C55E",
  ink: "#14532D",
  inkSoft: "#166534",
  kpiRamp: ["#DCFCE7", "#86EFAC", "#4ADE80", "#22C55E", "#16A34A"],
  resourceRamp: ["#EFFBF3", "#86EFAC", "#22C55E", "#15803C", "#14532D"],
  riskColor: { "低": "#22C55E", "中低": "#F59E0B", "中": "#EF4444" },
  typeColor: { wind: "#15803C", solar: "#F59E0B", storage: "#2563EB" },
  flowColor: "#15803C",
  flowEffect: "#22C55E",
};

function tipTitle(name) { return "<b>" + name + "</b>"; }

function stationTip(meta) {
  const lines = [
    tipTitle(meta.name),
    "类型：" + stationTypeLabel(meta.type),
    "容量：" + meta.capacity + " MW",
    "位置：" + meta.city + " · " + meta.province,
    "状态：" + meta.status,
  ];
  return lines.join("<br/>");
}

function flowTip(meta) {
  const lines = [
    tipTitle(meta.label),
    "类型：" + meta.type,
    "功率：" + meta.value + " MW",
    meta.from + " → " + meta.to,
  ];
  return lines.join("<br/>");
}

// 工厂：闭包持有图层状态
export function createGeoMap(el, options) {
  const { geoJson, provinces, stations, flows } = options;
  let chart = null;
  let layer = "kpi";
  let kpi = "capacity";
  let resource = "wind";
  let clickHandler = null;

  const MAP_VIEW = { map: "ne", roam: true, zoom: 1.12, center: [123.5, 45.0] };

  const MAP_STYLE = {
    label: { show: true, color: THEME.inkSoft, fontSize: 11 },
    itemStyle: { areaColor: THEME.surface, borderColor: THEME.border, borderWidth: 1.2 },
    emphasis: {
      label: { show: true, color: THEME.ink, fontWeight: 700 },
      itemStyle: { areaColor: "#DCFCE7", borderColor: THEME.borderHover },
    },
  };

  function geoBase() {
    return { ...MAP_VIEW, ...MAP_STYLE };
  }

  // KPI / 资源 共用的连续色带着色
  function choroplethOption(field, labelFn, ramp) {
    const data = provinces.map((p) => ({ name: p.name, value: p[field], meta: p }));
    const values = provinces.map((p) => Number(p[field]) || 0);
    const min = Math.min(...values);
    const max = Math.max(...values);
    return {
      tooltip: {
        trigger: "item",
        formatter: function (params) {
          const meta = params.data && params.data.meta;
          if (!meta) return params.name;
          const lines = [tipTitle(meta.name)];
          lines.push(labelFn(field) + "：" + meta[field]);
          lines.push("装机容量：" + meta.capacity + " GW");
          lines.push("场站数：" + meta.stationCount);
          return lines.join("<br/>");
        },
      },
      visualMap: {
        type: "continuous",
        min: min,
        max: max,
        left: 12,
        bottom: 12,
        text: [String(max), String(min)],
        textStyle: { color: THEME.ink, fontSize: 10 },
        inRange: { color: ramp },
        itemHeight: 110,
        calculable: true,
      },
      series: [{ type: "map", ...MAP_VIEW, ...MAP_STYLE, data: data }],
    };
  }

  // 风险分档着色（状态色 + 图例，颜色不单独承载信息）
  function riskOption() {
    const data = provinces.map((p) => ({ name: p.name, value: p.risk, meta: p }));
    return {
      tooltip: {
        trigger: "item",
        formatter: function (params) {
          const meta = params.data && params.data.meta;
          if (!meta) return params.name;
          const lines = [tipTitle(meta.name)];
          lines.push("风险等级：" + meta.risk);
          lines.push("装机容量：" + meta.capacity + " GW");
          lines.push("场站数：" + meta.stationCount);
          return lines.join("<br/>");
        },
      },
      visualMap: {
        type: "piecewise",
        pieces: ["低", "中低", "中"].map((r) => ({ label: r, value: r, color: THEME.riskColor[r] })),
        left: 12,
        bottom: 12,
        textStyle: { color: THEME.ink, fontSize: 10 },
        itemWidth: 14,
        itemHeight: 14,
      },
      series: [{ type: "map", ...MAP_VIEW, ...MAP_STYLE, data: data }],
    };
  }

  // 场站分布图层：scatter / effectScatter（储能脉冲），符号大小 = √容量
  function stationOption() {
    const types = ["wind", "solar", "storage"];
    const series = types.map((t) => {
      const list = stations.filter((s) => s.type === t);
      return {
        type: t === "storage" ? "effectScatter" : "scatter",
        name: stationTypeLabel(t),
        coordinateSystem: "geo",
        data: list.map((s) => ({ name: s.name, value: [s.lng, s.lat, s.capacity], meta: s })),
        symbolSize: function (val) {
          return Math.max(9, Math.sqrt(Number(val[2]) || 0) * 1.1);
        },
        itemStyle: { color: THEME.typeColor[t], borderColor: "#FFFFFF", borderWidth: 1.5 },
        emphasis: { itemStyle: { borderColor: THEME.ink, borderWidth: 2 } },
        label: { show: false },
        zlevel: 1,
      };
    });
    return {
      tooltip: {
        trigger: "item",
        formatter: function (params) {
          return params.data && params.data.meta ? stationTip(params.data.meta) : params.name;
        },
      },
      legend: {
        data: types.map((t) => stationTypeLabel(t)),
        orient: "horizontal",
        left: 12,
        bottom: 8,
        textStyle: { color: THEME.ink, fontSize: 11 },
        itemWidth: 10,
        itemHeight: 10,
      },
      geo: geoBase(),
      series: series,
    };
  }

  // 输电流向图层：lines 轨迹 + 流动箭头
  function flowOption() {
    const resolved = resolveFlows(flows, provinces);
    const data = resolved.filter((f) => f.fromCoord && f.toCoord)
      .map((f) => ({ coords: [f.fromCoord, f.toCoord], meta: f }));
    return {
      tooltip: {
        trigger: "item",
        formatter: function (params) {
          return params.data && params.data.meta ? flowTip(params.data.meta) : params.name;
        },
      },
      geo: geoBase(),
      series: [
        {
          type: "lines",
          name: "输电流向",
          coordinateSystem: "geo",
          zlevel: 1,
          data: data,
          lineStyle: { color: THEME.flowColor, width: 2.2, opacity: 0.65, curveness: 0.18 },
          effect: {
            show: true, period: 4, trailLength: 0.35,
            color: THEME.flowEffect, symbol: "arrow", symbolSize: 7,
          },
          emphasis: { lineStyle: { width: 4.5, opacity: 1 } },
        },
      ],
    };
  }

  // 按当前图层/指标选择配置
  function buildOption() {
    if (layer === "resource") return choroplethOption(resource, resourceLabel, THEME.resourceRamp);
    if (layer === "station") return stationOption();
    if (layer === "flow") return flowOption();
    return kpi === "risk" ? riskOption() : choroplethOption(kpi, kpiLabel, THEME.kpiRamp);
  }

  function render() {
    if (chart) chart.setOption(buildOption(), true);
  }

  function clickBridge(params) {
    if (!clickHandler) return;
    const meta = params.data && params.data.meta;
    if (params.seriesType === "map") {
      clickHandler({ kind: "province", name: params.name, meta: meta });
    } else if (params.seriesType === "scatter" || params.seriesType === "effectScatter") {
      clickHandler({ kind: "station", name: params.name, meta: meta });
    }
  }

  const api = {
    init() {
      echarts.registerMap("ne", geoJson);
      chart = echarts.init(el);
      render();
      window.addEventListener("resize", api.resize);
      if (clickHandler) chart.on("click", clickBridge);
      return api;
    },
    setLayer(l) { layer = l; render(); return api; },
    setKPI(k) { kpi = k; if (layer === "kpi") render(); return api; },
    setResource(r) { resource = r; if (layer === "resource") render(); return api; },
    getLayer() { return layer; },
    getKPI() { return kpi; },
    getResource() { return resource; },
    bindClick(cb) {
      clickHandler = cb;
      if (chart) {
        chart.off("click");
        if (cb) chart.on("click", clickBridge);
      }
      return api;
    },
    resize() { if (chart) chart.resize(); },
    getChart() { return chart; },
    dispose() {
      window.removeEventListener("resize", api.resize);
      if (chart) { chart.dispose(); chart = null; }
      clickHandler = null;
    },
  };
  return api;
}
