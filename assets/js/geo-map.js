// geo-map.js —— 东北区域经营地图组件（ECharts，B 展示岗维护）
// 职责：注册东北四省 GeoJSON，渲染八类图层（省份KPI着色 / 资源图层 / 场站分布 / 输电流向 / 发电热力 / 场站关联 / 时间轴气泡 / 3D柱状），
//       提供图层与指标切换、省份/场站点击回调。
// 依赖：全局 echarts（页面 <script src> 引入）；数据与聚合来自 geo-db.js / filter.js。
// 规则：只封装 echarts 生命周期与配置；页面提供容器 <div ref="geoMap">。
// 用法：
//   const gm = createGeoMap(el, { geoJson, provinces, stations, flows });
//   gm.init();
//   gm.setLayer("station");       // kpi | resource | station | flow | heat | assoc | bubble | bar3d
//   gm.setKPI("revenue");         // capacity | generation | revenue | risk
//   gm.setResource("solar");      // wind | solar
//   gm.setTheme("dark");          // light | dark（夜间发光）
//   gm.bindClick((e) => ...);     // { kind: "province"|"station", name, meta }

import { kpiLabel, resourceLabel, stationTypeLabel, resolveFlows, provinceShort } from "./geo-db.js";

// 主题：浅色（design-system/MASTER.md 绿色 ramp）+ 夜间发光（同色相深底）
const THEMES = {
  light: {
    background: "#FFFFFF",
    surface: "#F8FAFC",
    border: "#BBF7D0",
    borderHover: "#22C55E",
    ink: "#14532D",
    inkSoft: "#166534",
    areaHover: "#DCFCE7",
    kpiRamp: ["#DCFCE7", "#86EFAC", "#4ADE80", "#22C55E", "#16A34A"],
    resourceRamp: ["#EFFBF3", "#86EFAC", "#22C55E", "#15803C", "#14532D"],
    heatRamp: ["#F0FDF4", "#86EFAC", "#22C55E", "#15803C"],
    riskColor: { "低": "#22C55E", "中低": "#F59E0B", "中": "#EF4444" },
    typeColor: { wind: "#15803C", solar: "#F59E0B", storage: "#2563EB" },
    flowColor: "#15803C",
    flowEffect: "#22C55E",
    heatGlow: "rgba(34,197,94,0.5)",
    shadowGlow: "rgba(34,197,94,0.35)",
    flowBlend: null,
  },
  dark: {
    background: "#0B1220",
    surface: "#101D33",
    border: "#1F3A5F",
    borderHover: "#34D399",
    ink: "#E5E7EB",
    inkSoft: "#9CA3AF",
    areaHover: "#0F2B24",
    kpiRamp: ["#083344", "#0E5E4A", "#0D7A56", "#0E9B66", "#34D399"],
    resourceRamp: ["#0B3B2E", "#0E5E4A", "#10B981", "#34D399", "#A7F3D0"],
    heatRamp: ["#0B3B2E", "#0E9B66", "#34D399", "#A7F3D0"],
    riskColor: { "低": "#10B981", "中低": "#F59E0B", "中": "#F87171" },
    typeColor: { wind: "#34D399", solar: "#FBBF24", storage: "#60A5FA" },
    flowColor: "#34D399",
    flowEffect: "#A7F3D0",
    heatGlow: "rgba(52,211,153,0.6)",
    shadowGlow: "rgba(52,211,153,0.5)",
    flowBlend: "lighter",
  },
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

// 工厂：闭包持有图层/主题状态
// 由 GeoJSON 几何计算底图边界；区外坐标夹回地图内（避免飞线终点被裁剪）
function geoBounds(geoJson) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  function walk(v) {
    if (Array.isArray(v) && typeof v[0] === "number" && typeof v[1] === "number") {
      minX = Math.min(minX, v[0]); maxX = Math.max(maxX, v[0]);
      minY = Math.min(minY, v[1]); maxY = Math.max(maxY, v[1]);
      return;
    }
    if (Array.isArray(v)) v.forEach(walk);
  }
  for (const f of geoJson.features || []) walk(f.geometry.coordinates);
  return { minX: minX, minY: minY, maxX: maxX, maxY: maxY };
}
function fitCoord(bounds, coord, pad = 0.06) {
  if (coord[0] >= bounds.minX && coord[0] <= bounds.maxX &&
      coord[1] >= bounds.minY && coord[1] <= bounds.maxY) return coord;
  const dx = bounds.maxX - bounds.minX, dy = bounds.maxY - bounds.minY;
  return [
    Math.min(bounds.maxX - dx * pad, Math.max(bounds.minX + dx * pad, coord[0])),
    Math.min(bounds.maxY - dy * pad, Math.max(bounds.minY + dy * pad, coord[1])),
  ];
}

export function createGeoMap(el, options) {
  const { geoJson, provinces, stations, flows, periods } = options;
  let chart = null;
  let layer = "kpi";
  let kpi = "capacity";
  let resource = "wind";
  let themeName = "light";
  let clickHandler = null;
// 时间轴（气泡图层）：当前期索引与播放定时器
  let timeIdx = 0;
  let timeTimer = null;

  const MAP_VIEW = { map: "ne", roam: true, zoom: 1.12, center: [123.5, 45.0] };
  const BOUNDS = geoBounds(geoJson);

  function theme() { return THEMES[themeName]; }

  // 地图基底样式（随主题）
  function mapSeries() {
    const t = theme();
    return {
      label: { show: true, color: t.inkSoft, fontSize: 11 },
      itemStyle: { areaColor: t.surface, borderColor: t.border, borderWidth: 1.2 },
      emphasis: {
        label: { show: true, color: t.ink, fontWeight: 700 },
        itemStyle: {
          areaColor: t.areaHover,
          borderColor: t.borderHover,
          shadowBlur: 14,
          shadowColor: t.shadowGlow,
        },
      },
    };
  }

  function geoBase() { return { ...MAP_VIEW, ...mapSeries() }; }

  function visualMapText() { return { textStyle: { color: theme().ink, fontSize: 10 } }; }
// 气泡/时间轴取值：优先 provinces.json 的 history 序列，缺失回退 generation
  function bubbleValue(p) {
    const h = p.history;
    return Number((h && h.length ? h[Math.min(timeIdx, h.length - 1)] : p.generation)) || 0;
  }
  function periodLabel(i) {
    if (periods && periods.length) return periods[Math.min(i, periods.length - 1)];
    return "第" + (i + 1) + "期";
  }

  // KPI / 资源 共用的连续色带着色
  function choroplethOption(field, labelFn, ramp) {
    const t = theme();
    const data = provinces.map((p) => ({ name: p.name, value: p[field], meta: p }));
    const values = provinces.map((p) => Number(p[field]) || 0);
    const min = Math.min(...values);
    const max = Math.max(...values);
    return {
      backgroundColor: t.background,
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
        ...visualMapText(),
        inRange: { color: ramp },
        itemHeight: 110,
        calculable: true,
      },
      series: [{ type: "map", ...MAP_VIEW, ...mapSeries(), data: data }],
    };
  }

  // 风险分档着色（状态色 + 图例，颜色不单独承载信息）
  function riskOption() {
    const t = theme();
    const data = provinces.map((p) => ({ name: p.name, value: p.risk, meta: p }));
    return {
      backgroundColor: t.background,
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
        pieces: ["低", "中低", "中"].map((r) => ({ label: r, value: r, color: t.riskColor[r] })),
        left: 12,
        bottom: 12,
        ...visualMapText(),
        itemWidth: 14,
        itemHeight: 14,
      },
      series: [{ type: "map", ...MAP_VIEW, ...mapSeries(), data: data }],
    };
  }

  // 发电热力图层：省份质心发光斑，半径 ∝ 今日发电（深色下更亮）
  function heatOption() {
    const t = theme();
    const data = provinces.map((p) => ({
      name: p.name,
      value: [p.center[0], p.center[1], p.generation],
      meta: p,
    }));
    const values = provinces.map((p) => Number(p.generation) || 0);
    const min = Math.min(...values);
    const max = Math.max(...values);
    return {
      backgroundColor: t.background,
      tooltip: {
        trigger: "item",
        formatter: function (params) {
          const meta = params.data && params.data.meta;
          if (!meta) return params.name;
          const lines = [tipTitle(meta.name)];
          lines.push("今日发电：" + meta.generation + " MWh");
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
        ...visualMapText(),
        inRange: { color: t.heatRamp },
        itemHeight: 110,
        calculable: true,
      },
      geo: geoBase(),
      series: [
        {
          type: "scatter",
          coordinateSystem: "geo",
          data: data,
          symbolSize: function (val) { return Math.sqrt(Number(val[2]) || 0) * 1.6; },
          itemStyle: {
            shadowBlur: 24,
            shadowColor: t.heatGlow,
            borderColor: "#FFFFFF",
            borderWidth: 1,
          },
          emphasis: { itemStyle: { shadowBlur: 40 } },
          zlevel: 2,
        },
      ],
    };
  }

  // 场站分布图层：scatter / effectScatter（储能脉冲），符号大小 = √容量
  function stationOption() {
    const t = theme();
    const types = ["wind", "solar", "storage"];
    const series = types.map((tp) => {
      const list = stations.filter((s) => s.type === tp);
      return {
        type: tp === "storage" ? "effectScatter" : "scatter",
        name: stationTypeLabel(tp),
        coordinateSystem: "geo",
        data: list.map((s) => ({ name: s.name, value: [s.lng, s.lat, s.capacity], meta: s })),
        symbolSize: function (val) {
          return Math.max(9, Math.sqrt(Number(val[2]) || 0) * 1.1);
        },
        itemStyle: {
          color: t.typeColor[tp],
          borderColor: "#FFFFFF",
          borderWidth: 1.5,
          shadowBlur: 8,
          shadowColor: t.shadowGlow,
        },
        emphasis: { itemStyle: { borderColor: t.ink, borderWidth: 2, shadowBlur: 16 } },
        label: { show: false },
        zlevel: 1,
      };
    });
    return {
      backgroundColor: t.background,
      tooltip: {
        trigger: "item",
        formatter: function (params) {
          return params.data && params.data.meta ? stationTip(params.data.meta) : params.name;
        },
      },
      legend: {
        data: types.map((tp) => stationTypeLabel(tp)),
        orient: "horizontal",
        left: 12,
        bottom: 8,
        textStyle: { color: t.ink, fontSize: 11 },
        itemWidth: 10,
        itemHeight: 10,
      },
      geo: geoBase(),
      series: series,
    };
  }

  // 输电流向图层：lines 轨迹 + 流动箭头 + 端点脉冲（迁徙感）
  function flowOption() {
    const t = theme();
    const resolved = resolveFlows(flows, provinces);
    resolved.forEach((f) => { if (f.toCoord) f.toCoord = fitCoord(BOUNDS, f.toCoord); });
    const data = resolved.filter((f) => f.fromCoord && f.toCoord)
      .map((f) => ({ coords: [f.fromCoord, f.toCoord], meta: f }));
    const ends = [];
    const seen = {};
    data.forEach((d) => {
      d.coords.forEach((c) => {
        const key = c[0] + "," + c[1];
        if (!seen[key]) { seen[key] = true; ends.push({ name: "输电节点", value: c }); }
      });
    });
    const line = {
      type: "lines",
      name: "输电流向",
      coordinateSystem: "geo",
      zlevel: 1,
      data: data,
      lineStyle: { color: t.flowColor, width: 3, opacity: 0.75, curveness: 0.22 },
      effect: {
        show: true, period: 3.5, trailLength: 0.4,
        color: t.flowEffect, symbol: "arrow", symbolSize: 8,
      },
      emphasis: { lineStyle: { width: 5, opacity: 1 } },
    };
    if (t.flowBlend) line.blendMode = t.flowBlend;
    return {
      backgroundColor: t.background,
      tooltip: {
        trigger: "item",
        formatter: function (params) {
          return params.data && params.data.meta ? flowTip(params.data.meta) : params.name;
        },
      },
      geo: geoBase(),
      series: [
        line,
        {
          type: "effectScatter",
          coordinateSystem: "geo",
          data: ends,
          symbolSize: 6,
          itemStyle: { color: t.flowEffect, shadowBlur: 10, shadowColor: t.heatGlow },
          rippleEffect: { period: 4, scale: 3, brushType: "stroke" },
          zlevel: 2,
        },
      ],
    };
  }

  // 场站关联线：场站 → 本省汇聚（省级电网），线宽 ∝ 容量，按类型着色
  function assocOption() {
    const t = theme();
    const centerByShort = Object.create(null);
    provinces.forEach((p) => { centerByShort[p.short] = p.center; });
    const linesData = stations
      .map((s) => ({ s: s, c: centerByShort[provinceShort(s.province)] }))
      .filter((x) => x.c)
      .map((x) => ({
        coords: [[x.s.lng, x.s.lat], x.c],
        lineStyle: { color: t.typeColor[x.s.type], width: Math.max(1.5, x.s.capacity * 0.9) },
        meta: x.s,
      }));
    const types = ["wind", "solar", "storage"];
    const scatterSeries = types.map((tp) => {
      const list = stations.filter((s) => s.type === tp);
      return {
        type: tp === "storage" ? "effectScatter" : "scatter",
        name: stationTypeLabel(tp),
        coordinateSystem: "geo",
        data: list.map((s) => ({ name: s.name, value: [s.lng, s.lat, s.capacity], meta: s })),
        symbolSize: function (val) { return Math.max(8, Math.sqrt(Number(val[2]) || 0) * 1.0); },
        itemStyle: { color: t.typeColor[tp], borderColor: "#FFFFFF", borderWidth: 1.2, shadowBlur: 8, shadowColor: t.shadowGlow },
        emphasis: { itemStyle: { borderColor: t.ink, borderWidth: 2, shadowBlur: 16 } },
        label: { show: false },
        zlevel: 2,
      };
    });
    return {
      backgroundColor: t.background,
      tooltip: {
        trigger: "item",
        formatter: function (params) {
          return params.data && params.data.meta ? stationTip(params.data.meta) : params.name;
        },
      },
      legend: {
        data: types.map((tp) => stationTypeLabel(tp)),
        orient: "horizontal", left: 12, bottom: 8,
        textStyle: { color: t.ink, fontSize: 11 }, itemWidth: 10, itemHeight: 10,
      },
      geo: geoBase(),
      series: [
        {
          type: "lines",
          name: "场站关联",
          coordinateSystem: "geo",
          zlevel: 1,
          data: linesData,
          lineStyle: { opacity: 0.7, curveness: 0.18 },
          effect: { show: true, period: 4, trailLength: 0.35, color: t.flowEffect, symbol: "arrow", symbolSize: 6 },
          emphasis: { lineStyle: { opacity: 1 } },
        },
      ].concat(scatterSeries),
    };
  }

  // 时间轴气泡：省份质心气泡 ∝ 该期发电，随 periods 播放
  function bubbleOption() {
    const t = theme();
    const vals = provinces.map(bubbleValue);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const data = provinces.map((p) => ({
      name: p.name,
      value: [p.center[0], p.center[1], bubbleValue(p)],
      symbolSize: Math.sqrt(bubbleValue(p)) * 3.2,
      meta: p,
    }));
    return {
      backgroundColor: t.background,
      tooltip: {
        trigger: "item",
        formatter: function (params) {
          const meta = params.data && params.data.meta;
          if (!meta) return params.name;
          const lines = [tipTitle(meta.name)];
          lines.push(periodLabel(timeIdx) + " 发电：" + params.data.value[2] + " MWh");
          lines.push("装机：" + meta.capacity + " GW · 场站 " + meta.stationCount + " 座");
          return lines.join("<br/>");
        },
      },
      visualMap: {
        type: "continuous", min: min, max: max,
        left: 12, bottom: 12, text: [String(max), String(min)],
        ...visualMapText(), inRange: { color: t.kpiRamp }, itemHeight: 110, calculable: true,
      },
      geo: geoBase(),
      series: [
        {
          type: "scatter",
          coordinateSystem: "geo",
          data: data,
          symbolSize: function (val, params) { return params.data.symbolSize; },
          itemStyle: { shadowBlur: 18, shadowColor: t.shadowGlow, borderColor: "#FFFFFF", borderWidth: 1.2, opacity: 0.9 },
          label: { show: true, position: "top", formatter: "{b}", color: t.ink, fontSize: 11, fontWeight: 700 },
          emphasis: { itemStyle: { shadowBlur: 30, borderColor: t.ink } },
          zlevel: 2,
        },
      ],
    };
  }

  // 3D 柱状：省份质心立 3D 柱（ECharts GL，需 echarts-gl.min.js），高度 = KPI 值
  function bar3dOption() {
    const t = theme();
    const vals = provinces.map((p) => Number(p[kpi]) || 0);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const data = provinces.map((p) => ({
      name: p.name,
      value: [p.center[0], p.center[1], Number(p[kpi]) || 0],
      meta: p,
    }));
    return {
      backgroundColor: t.background,
      tooltip: {
        trigger: "item",
        formatter: function (params) {
          const meta = params.data && params.data.meta;
          return meta ? tipTitle(meta.name) + "<br/>" + kpiLabel(kpi) + "：" + meta[kpi] : params.name;
        },
      },
      visualMap: {
        type: "continuous", dimension: 2, min: min, max: max,
        left: 12, bottom: 12, text: [String(max), String(min)],
        ...visualMapText(), inRange: { color: t.kpiRamp }, itemHeight: 110, calculable: true,
      },
      geo3D: {
        map: "ne", roam: true, boxHeight: 12, regionHeight: 1.2,
        itemStyle: { color: t.surface, borderColor: t.border, borderWidth: 1.2 },
        label: { show: false },
      },
      series: [
        {
          type: "bar3D",
          coordinateSystem: "geo3D",
          data: data,
          shading: "lambert",
          bevelSize: 0.3,
          label: { show: true, position: "top", formatter: "{b}", textStyle: { color: t.ink, fontSize: 10 } },
          itemStyle: { opacity: 0.9 },
          emphasis: { itemStyle: { opacity: 1 } },
        },
      ],
    };
  }
  // 按当前图层/指标选择配置
  function buildOption() {
    if (layer === "resource") return choroplethOption(resource, resourceLabel, theme().resourceRamp);
    if (layer === "station") return stationOption();
    if (layer === "flow") return flowOption();
    if (layer === "heat") return heatOption();
    if (layer === "assoc") return assocOption();
    if (layer === "bubble") return bubbleOption();
    if (layer === "bar3d") return bar3dOption();
    return kpi === "risk" ? riskOption() : choroplethOption(kpi, kpiLabel, theme().kpiRamp);
  }

  function render() {
    if (chart) chart.setOption(buildOption(), true);
  }

  function clickBridge(params) {
    if (!clickHandler) return;
    const meta = params.data && params.data.meta;
    if (params.seriesType === "map") {
      clickHandler({ kind: "province", name: params.name, meta: meta });
    } else if (params.seriesType === "bar3D" && meta) {
      clickHandler({ kind: "province", name: params.name, meta: meta });
    } else if ((params.seriesType === "scatter" || params.seriesType === "effectScatter") && meta && meta.type) {
      clickHandler({ kind: "station", name: params.name, meta: meta });
    } else if (params.seriesType === "scatter" && meta) {
      clickHandler({ kind: "province", name: params.name, meta: meta });
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
    setTheme(t) { if (THEMES[t]) themeName = t; render(); return api; },
    getTheme() { return themeName; },
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
    setTime(i) {
      const n = periods && periods.length ? periods.length : 7;
      timeIdx = Math.max(0, Math.min(i || 0, n - 1));
      if (layer === "bubble") render();
      return api;
    },
    getTime() { return timeIdx; },
    getPeriods() { return periods || []; },
    playTime() {
      if (timeTimer) { clearInterval(timeTimer); timeTimer = null; return api; }
      const n = periods && periods.length ? periods.length : 7;
      timeTimer = setInterval(function () {
        timeIdx = (timeIdx + 1) % n;
        render();
      }, 900);
      return api;
    },
    resize() { if (chart) chart.resize(); },
    getChart() { return chart; },
    dispose() {
      if (timeTimer) { clearInterval(timeTimer); timeTimer = null; }
      window.removeEventListener("resize", api.resize);
      if (chart) { chart.dispose(); chart = null; }
      clickHandler = null;
    },
  };
  return api;
}
