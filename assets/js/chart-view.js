// chart-view.js —— 统一图表展示组件（B 展示岗维护）
// 职责：统一 ECharts 生命周期 + 数据适配。页面只传数据，不碰 echarts API。
// 规则：无 DOM 依赖，只封装逻辑；页面提供容器 <div ref="chart">
// 接口契约：见同目录 chart-view.md（options.type 决定 data 形状，共 6 类）

// 标记线配色取自 design-system/MASTER.md 配色 token：
// charge（充电/储能）→ Accent 绿 #22C55E；discharge（放电）→ Destructive 红 #EF4444
const MARK_COLORS = { charge: "#22C55E", discharge: "#EF4444" };
const MARK_LABELS = { charge: "充电", discharge: "放电" };

// 图表暗色主题：取自 design-system/MASTER.md 配色 token，
// 保证文字/轴线在深底 #020617 上可读（对比度 ≥ 4.5:1）
const THEME = {
  text: "#F8FAFC",        // Foreground —— 文字/轴标签
  axisLine: "#334155",    // Border —— 坐标轴线
  splitLine: "#1A1E2F",   // Muted —— 网格分隔线
  tooltipBg: "#1E293B",   // Secondary —— 提示框底
  tooltipBorder: "#334155",
};

function categoryAxis(labels) {
  return { type: "category", data: labels };
}

function valueAxis() {
  return { type: "value" };
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
    xAxis: categoryAxis(labels),
    yAxis: valueAxis(),
    series,
  };

  if (options.horizontal) {
    option.xAxis = valueAxis();
    option.yAxis = categoryAxis(labels);
  }
  if (options.stacked) {
    series.forEach((s) => { s.stack = "total"; });
  }
  if (type === "line") {
    option.xAxis.boundaryGap = false;
    if (options.smooth) series.forEach((s) => { s.smooth = true; });
    if (options.area) series.forEach((s) => { s.areaStyle = {}; });
  }

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
function buildPie(data, options) {
  return {
    tooltip: { trigger: "item" },
    series: [{
      type: "pie",
      radius: options.donut ? ["40%", "70%"] : "70%",
      label: { show: options.showLabel !== false },
      data: data.map((d) => ({ name: d.name, value: d.value })),
    }],
  };
}

// confidence：{labels, actual, forecast, upper, lower}
function buildConfidence(data) {
  const labels = data.labels || [];
  const actual = data.actual || [];
  const forecast = data.forecast || [];
  const upper = data.upper || [];
  const lower = data.lower || [];
  const band = upper.map((v, i) => v - (lower[i] !== undefined ? lower[i] : v));
  return {
    tooltip: { trigger: "axis" },
    xAxis: { type: "category", boundaryGap: false, data: labels },
    yAxis: valueAxis(),
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
        xAxis: m.label,
        lineStyle: { color: MARK_COLORS[m.type] || MARK_COLORS.charge },
        label: { formatter: MARK_LABELS[m.type] || m.type || "" },
      })),
    };
  }

  return {
    tooltip: { trigger: "axis" },
    xAxis: categoryAxis(labels),
    yAxis: valueAxis(),
    series,
  };
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
  axis.axisLine.lineStyle.color = THEME.axisLine;

  axis.axisLabel = axis.axisLabel || {};
  axis.axisLabel.color = THEME.text;

  if (axis.type === "value") {
    axis.splitLine = axis.splitLine || {};
    axis.splitLine.lineStyle = axis.splitLine.lineStyle || {};
    axis.splitLine.lineStyle.color = THEME.splitLine;
  }
}

// 统一套主题（setOption 前调用一次）
function applyTheme(option) {
  styleAxis(option.xAxis);
  styleAxis(option.yAxis);
  option.textStyle = { color: THEME.text };
  option.tooltip = option.tooltip || {};
  option.tooltip.backgroundColor = THEME.tooltipBg;
  option.tooltip.borderColor = THEME.tooltipBorder;
  option.tooltip.textStyle = { color: THEME.text };
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
    chart.setOption(applyTheme(option));
  }

  function dispose() {
    window.removeEventListener("resize", resize);
    chart.dispose();
  }

  return { setData, dispose };
}
