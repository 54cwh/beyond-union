// chart-view.js —— 统一图表展示组件（B 展示岗维护）
// 职责：统一 ECharts 生命周期 + 数据适配。页面只传数据，不碰 echarts API。
// 规则：无 DOM 依赖，只封装逻辑；页面提供容器 <div ref="chart">
// 接口契约：见同目录 chart-view.md（options.type 决定 data 形状，共 6 类）

// 标记线配色取自 design-system/MASTER.md 配色 token：
// charge（充电/储能）→ Accent 绿 #22C55E；discharge（放电）→ Destructive 红 #EF4444
const MARK_COLORS = { charge: "#22C55E", discharge: "#EF4444" };
const MARK_LABELS = { charge: "充电", discharge: "放电" };

// 图表浅色主题（v3 设计语言：白底面板上黑字可读，对比度 ≥ 4.5:1）
// 主题取色：跟随全站夜间/日间模式（html.theme-dark，由 common.js 统一控制）
function isDarkTheme() {
  return typeof document !== "undefined" &&
    document.documentElement.classList.contains("theme-dark");
}

const LIGHT_THEME = {
  text: "#1A1A1A",        // 主文字/轴标签（近黑）
  axisLine: "#9CA3AF",    // 坐标轴线（灰）
  splitLine: "#E5E5E5",   // 网格分隔线（浅灰）
  tooltipBg: "#FFFFFF",   // 提示框底（白）
  tooltipBorder: "#1A1A1A",
};
const DARK_THEME = {
  text: "#E5E7EB",        // 主文字/轴标签（浅灰）
  axisLine: "#475569",    // 坐标轴线（灰蓝）
  splitLine: "#243A5E",   // 网格分隔线（深蓝）
  tooltipBg: "#101D33",   // 提示框底（深蓝）
  tooltipBorder: "#1F3A5F",
};
const THEME = () => (isDarkTheme() ? DARK_THEME : LIGHT_THEME);

// 分类系列色（白底 #FFFFFF 上校验：饱和、对比足够、CVD 色盲安全）：
// 固定顺序、不循环；绿/红保留给充放电状态色，故系列色只取 6 个色相
const SERIES_COLORS = ["#2563eb", "#d95926", "#0d9488", "#ca8a04", "#db2777", "#7c3aed"];

function categoryAxis(labels, options = {}) {
  const axis = { type: "category", data: labels };
  if (options.xInterval != null) {
    axis.axisLabel = { interval: options.xInterval };
  }
  return axis;
}

// value 轴：默认 splitNumber=4 避免刻度标签重叠；可传 name / splitNumber
function valueAxis(options = {}) {
  const axis = { type: "value", splitNumber: options.splitNumber || 4 };
  if (options.name) axis.name = options.name;
  return axis;
}

// 图例：多系列默认右上角（不独占一行）；options.legend===false 关闭
function legendOption(series, options = {}) {
  if (options.legend === false) return undefined;
  return {
    data: series.map((s) => s.name),
    top: 0,
    right: 0,
    itemWidth: 12,
    itemHeight: 12,
    textStyle: { fontSize: 12 },
  };
}

// 双 Y 轴：options.yAxis2 = { name, series: [系列名...] }
// 命中的系列挂到右轴（yAxisIndex:1），其余留在左轴
function applyDualAxis(option, options) {
  if (!options || !options.yAxis2) return option;
  const right = options.yAxis2;
  const rightNames = (right && right.series) || [];
  option.yAxis = [
    valueAxis({ splitNumber: options.splitNumber, name: options.yName }),
    valueAxis({ splitNumber: options.splitNumber, name: right.name }),
  ];
  option.series.forEach((s) => {
    if (rightNames.indexOf(s.name) >= 0) s.yAxisIndex = 1;
  });
  return option;
}

// bar / line：单系列 [{label, value}] 或多系列 {labels:[], series:[{name, data:[]}]}
function buildCartesian(data, options, type) {
  let labels;
  let series;
  if (Array.isArray(data)) {
    labels = data.map((d) => d.label);
    series = [{ name: options.name || "", type, data: data.map((d) => d.value) }];
  } else {
    labels = (data && data.labels) || [];
    series = ((data && data.series) || []).map((s) => ({ name: s.name || "", type, data: s.data || [] }));
  }

  const option = {
    tooltip: { trigger: "axis" },
    xAxis: categoryAxis(labels, options),
    yAxis: valueAxis(options),
    series,
  };

  if (options.horizontal) {
    option.xAxis = valueAxis(options);
    option.yAxis = categoryAxis(labels, options);
  }
  if (options.stacked) {
    series.forEach((s) => { s.stack = "total"; });
  }
  if (type === "line") {
    option.xAxis.boundaryGap = false;
    if (options.smooth) series.forEach((s) => { s.smooth = true; });
    if (options.area) series.forEach((s) => { s.areaStyle = {}; });
  }

  if (series.length >= 2) {
    option.legend = legendOption(series, options);
  }

  applyDualAxis(option, options);

  return option;
}

// scatter：[{x, y, label}]
function buildScatter(data, options) {
  return {
    tooltip: { trigger: "item" },
    xAxis: { type: "value", name: options.xName || "" },
    yAxis: { type: "value", name: options.yName || "" },
    series: [{
      type: "scatter",
      data: data.map((d) => ({ value: [d.x, d.y], name: d.label || "" })),
    }],
  };
}

// pie：[{name, value}]
// options：donut（环形）、showLabel（直接标签）、legend:false（关图例）、
//          legendRight:true（图例右侧竖排 + 每项带数量）
function buildPie(data, options) {
  const rightLegend = options.legendRight === true;
  const option = {
    tooltip: { trigger: "item" },
    series: [{
      type: "pie",
      radius: options.donut ? ["40%", "70%"] : "70%",
      center: rightLegend ? ["34%", "50%"] : ["50%", "50%"],
      label: { show: options.showLabel !== false },
      data: data.map((d) => ({ name: d.name, value: d.value })),
    }],
  };
  if (options.legend !== false) {
    option.legend = rightLegend ? {
      orient: "vertical",
      right: 8,
      top: "middle",
      itemWidth: 12,
      itemHeight: 12,
      itemGap: 12,
      textStyle: { fontSize: 12 },
      formatter: (name) => {
        const hit = (data || []).find((d) => d.name === name);
        return hit ? `${name}  ${hit.value}` : name;
      },
    } : {
      data: data.map((d) => d.name),
      bottom: 0,
      itemWidth: 12,
      itemHeight: 12,
      textStyle: { fontSize: 12 },
    };
  }
  return option;
}

// confidence：{labels, actual, forecast, upper, lower}
function buildConfidence(data, options = {}) {
  const labels = data.labels || [];
  const actual = data.actual || [];
  const forecast = data.forecast || [];
  const upper = data.upper || [];
  const lower = data.lower || [];
  const band = upper.map((v, i) => v - (lower[i] !== undefined ? lower[i] : v));
  return {
    tooltip: { trigger: "axis" },
    legend: legendOption([{ name: "预测" }, { name: "实际" }], options),
    xAxis: Object.assign(categoryAxis(labels, options), { boundaryGap: false }),
    yAxis: valueAxis(options),
    series: [
      { name: "下界", type: "line", data: lower, stack: "ci", lineStyle: { opacity: 0 }, symbol: "none" },
      { name: "置信区间", type: "line", data: band, stack: "ci", lineStyle: { opacity: 0 }, symbol: "none", areaStyle: { opacity: 0.25 } },
      { name: "预测", type: "line", data: forecast, lineStyle: { type: "dashed" } },
      { name: "实际", type: "line", data: actual },
    ],
  };
}

// timeline：{labels:[时间], series:[{name, data:[]}], marks:[{label, type:'charge'|'discharge'}]}
function buildTimeline(data, options) {
  const labels = data.labels || [];
  const series = (data.series || []).map((s) => ({ name: s.name || "", type: "line", data: s.data || [] }));
  const marks = data.marks || [];

  if (options.mark !== false && marks.length && series.length) {
    series[0].markLine = {
      symbol: "none",
      data: marks.map((m) => ({
        name: m.label,
        xAxis: m.time,
        lineStyle: { color: MARK_COLORS[m.type] || MARK_COLORS.charge },
        label: { formatter: MARK_LABELS[m.type] || m.type || "" },
      })),
    };
  }

  const option = {
    tooltip: { trigger: "axis" },
    xAxis: categoryAxis(labels, options),
    yAxis: valueAxis(options),
    series,
  };
  if (series.length >= 2) {
    option.legend = legendOption(series, options);
  }
  applyDualAxis(option, options);
  return option;
}

// 给单轴套主题（轴线颜色 + 轴标签颜色 + value 轴分隔线颜色）
function styleAxis(axis) {
  if (!axis) return;
  if (Array.isArray(axis)) {
    axis.forEach(styleAxis);
    return;
  }
  axis.axisLine = axis.axisLine || {};
  axis.axisLine.lineStyle = axis.axisLine.lineStyle || {};
  axis.axisLine.lineStyle.color = THEME().axisLine;

  axis.axisLabel = axis.axisLabel || {};
  axis.axisLabel.color = THEME().text;
  axis.axisLabel.fontSize = 12;
  axis.axisLabel.margin = 6;

  if (axis.type === "value") {
    axis.splitLine = axis.splitLine || {};
    axis.splitLine.lineStyle = axis.splitLine.lineStyle || {};
    axis.splitLine.lineStyle.color = THEME().splitLine;
  }
}

// 统一套主题（setOption 前调用一次）
function applyTheme(option, options = {}) {
  option.color = options.colors || SERIES_COLORS;
  styleAxis(option.xAxis);
  styleAxis(option.yAxis);
  option.textStyle = { color: THEME().text };
  option.tooltip = option.tooltip || {};
  option.tooltip.backgroundColor = THEME().tooltipBg;
  option.tooltip.borderColor = THEME().tooltipBorder;
  option.tooltip.textStyle = { color: THEME().text };
  return option;
}

export function createChart(el) {
  const chart = echarts.init(el);

  function resize() {
    chart.resize();
  }
  window.addEventListener("resize", resize);

  function setData(data, options = {}) {
    const type = options.type || "bar";
    let option;
    switch (type) {
      case "bar":
      case "line":
        option = buildCartesian(data, options, type);
        break;
      case "scatter":
        option = buildScatter(data, options);
        break;
      case "pie":
        option = buildPie(data, options);
        break;
      case "confidence":
        option = buildConfidence(data);
        break;
      case "timeline":
        option = buildTimeline(data, options);
        break;
      default:
        option = buildCartesian(data, options, "bar");
    }
    chart.setOption(applyTheme(option, options));
  }

  function dispose() {
    window.removeEventListener("resize", resize);
    chart.dispose();
  }

  return { setData, dispose };
}
