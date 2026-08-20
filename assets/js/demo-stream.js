// demo-stream.js —— 演示模式实时推演曲线（B 展示岗维护）
// 职责：经营闭环演示时驱动「今日发电实时推演」曲线，把 toast 叙事升级为可视化：
//   预测下调（风速下降）→ 置信区间变宽（预警）→ 实际值逐小时流入 → 充放电/确认标记线。
// 铁律：页面不直接 echarts.init（chart-view.md）；本模块封装 echarts 生命周期（同 geo-map.js 先例）。
// 用法：p1 演示启动时 createDemoStream(el)，之后按演示步调用 applyStep(index)。
// 配色：浅色主题 token（common.css 视觉宪法 v2），非 chart-view.js 的暗色 THEME。

const HOURS = 24;
const LABELS = Array.from({ length: HOURS }, (_, h) => String(h).padStart(2, "0") + ":00");

// 浅色底可读配色（取自 common.css :root token）
// 主题取色：跟随全站夜间/日间模式（html.theme-dark）
function isDarkTheme() {
  return typeof document !== "undefined" &&
    document.documentElement.classList.contains("theme-dark");
}

const C_LIGHT = {
  text: "#14532D",          // --color-foreground
  axisLine: "#BBF7D0",      // --color-border
  splitLine: "#DCFCE7",     // --color-muted-2
  forecast: "#15803C",      // --color-accent-dark（虚线预测）
  actual: "#22C55E",        // --color-accent（实际实线）
  band: "rgba(34,197,94,0.16)",
  area: "rgba(34,197,94,0.10)",
  charge: "#22C55E",
  discharge: "#EF4444",
  confirm: "#16A34A",
};
const C_DARK = {
  text: "#A7F3D0",
  axisLine: "#1F3A5F",
  splitLine: "#243A5E",
  forecast: "#34D399",
  actual: "#34D399",
  band: "rgba(52,211,153,0.16)",
  area: "rgba(52,211,153,0.10)",
  charge: "#34D399",
  discharge: "#F87171",
  confirm: "#34D399",
};
const C = () => (isDarkTheme() ? C_DARK : C_LIGHT);

// 基准预测（风速下降前，日间型日曲线，单位 MW）
const BASE_FORECAST = [2.2, 1.8, 1.6, 1.7, 2.1, 2.6, 3.4, 4.8, 6.2, 7.5, 8.6, 9.4, 9.8, 9.6, 9.0, 8.2, 7.4, 6.5, 5.4, 4.2, 3.2, 2.6, 2.4, 2.2];

// 风速下降后：风电时段下调更多（18%），光伏峰值时段影响小
function dropFactor(h) {
  const solarPeak = h >= 10 && h <= 15;
  return solarPeak ? 0.92 : 0.80;
}

// 确定性「真实值」：预测 + 小幅确定偏移（避免随机导致截图不稳定）
function truth(v, h) {
  return +(v * (0.98 + 0.05 * Math.sin(h * 1.3))).toFixed(2);
}

export function createDemoStream(el) {
  const chart = echarts.init(el);

  let forecast = BASE_FORECAST.slice();
  let actual = new Array(HOURS).fill(null);
  let bandFactor = new Array(HOURS).fill(0.07); // 置信带宽因子（基础 ±7%）
  let marks = []; // [{ hour, label, type }]

  function buildSeries() {
    const upper = forecast.map((v, i) => +(v * (1 + bandFactor[i])).toFixed(2));
    const lower = forecast.map((v, i) => +(v * (1 - bandFactor[i])).toFixed(2));
    const bandWidth = upper.map((u, i) => +(u - lower[i]).toFixed(2));

    const forecastSeries = {
      name: "预测",
      type: "line",
      data: forecast,
      smooth: true,
      symbol: "circle",
      symbolSize: 5,
      lineStyle: { color: C().forecast, type: "dashed", width: 2 },
      itemStyle: { color: C().forecast },
    };
    if (marks.length) {
      forecastSeries.markLine = {
        symbol: "none",
        data: marks.map((m) => ({
          name: m.label,
          xAxis: m.hour,
          lineStyle: { color: C[m.type] || C().confirm },
          label: { formatter: m.label, color: C[m.type] || C().confirm, fontSize: 11 },
        })),
      };
    }

    return [
      // 置信区间：stack 面积技巧（下界透明线 + 带宽面积），复用 chart-view buildConfidence 思路
      { name: "区间下界", type: "line", data: lower, stack: "band", lineStyle: { opacity: 0 }, symbol: "none", silent: true },
      { name: "置信区间", type: "line", data: bandWidth, stack: "band", lineStyle: { opacity: 0 }, symbol: "none", areaStyle: { color: C().band }, silent: true },
      forecastSeries,
      { name: "实际", type: "line", data: actual, smooth: true, symbol: "circle", symbolSize: 4, lineStyle: { color: C().actual, width: 2.5 }, itemStyle: { color: C().actual }, areaStyle: { color: C().area } },
    ];
  }

  function buildOption() {
    return {
      color: [C().actual, C().forecast],
      tooltip: { trigger: "axis" },
      legend: { data: ["预测", "实际"], top: 0 },
      grid: { left: 44, right: 16, top: 36, bottom: 58 },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: LABELS,
        axisLine: { lineStyle: { color: C().axisLine } },
        axisLabel: { color: C().text, fontSize: 11 },
      },
      yAxis: {
        type: "value",
        name: "MW",
        nameTextStyle: { color: C().text },
        axisLabel: { color: C().text },
        splitLine: { lineStyle: { color: C().splitLine } },
      },
      dataZoom: [
        { type: "inside", start: 0, end: 100 },
        { type: "slider", start: 0, end: 100, height: 18, bottom: 6 },
      ],
      series: buildSeries(),
    };
  }

  function render() {
    chart.setOption(buildOption());
  }

  function reset() {
    forecast = BASE_FORECAST.slice();
    actual = new Array(HOURS).fill(null);
    bandFactor = new Array(HOURS).fill(0.07);
    marks = [];
    render();
  }

  function setForecastDown() {
    forecast = BASE_FORECAST.map((v, h) => +(v * dropFactor(h)).toFixed(2));
    render();
  }

  function widenBand(fromHour, toHour, factor = 0.18) {
    for (let h = fromHour; h <= toHour; h++) bandFactor[h] = factor;
    render();
  }

  function narrowBand() {
    bandFactor = new Array(HOURS).fill(0.07);
    render();
  }

  function streamTo(hour) {
    for (let h = 0; h <= hour && h < HOURS; h++) {
      if (actual[h] === null) actual[h] = truth(forecast[h], h);
    }
    render();
  }

  function addMark(hour, label, type) {
    marks = marks.filter((m) => m.hour !== hour);
    marks.push({ hour, label, type });
    render();
  }

  function applyStep(index) {
    switch (index) {
      case 0: streamTo(6); break;                                            // 天气变化，实际值流入至 06:00
      case 1: setForecastDown(); streamTo(10); break;                        // 风力预测下调 + 实际至 10:00
      case 2: widenBand(14, 17); streamTo(14); break;                        // 黄色预警 14—17 时 + 实际至 14:00
      case 3: addMark("11:00", "储能充电", "charge"); streamTo(15); break;   // 重新优化储能 + 实际至 15:00
      case 4: addMark("18:00", "储能放电", "discharge"); break;              // 储能策略调整
      case 5: break;                                                          // 交易组合变化，曲线形态不变
      case 6: narrowBand(); break;                                            // 偏差风险下降
      case 7: addMark("14:00", "方案确认", "confirm"); break;                 // 确认方案
      default: break;
    }
  }

  function dispose() {
    chart.dispose();
  }

  render();

  return { reset, setForecastDown, widenBand, narrowBand, streamTo, addMark, applyStep, dispose };
}
