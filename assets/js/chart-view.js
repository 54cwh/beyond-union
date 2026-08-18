// chart-view.js —— 统一图表展示组件（B 展示岗维护）
// 职责：统一 ECharts 生命周期 + 数据适配。页面只传数据，不碰 echarts API。
// 规则：无 DOM 依赖，只封装逻辑；页面提供容器 <div ref="chart">

/**
 * 创建一个受管理的图表实例。
 * @param {HTMLElement} el 图表容器
 * @returns {Object} { setData, dispose }
 */
export function createChart(el) {
  const chart = echarts.init(el);

  function resize() {
    chart.resize();
  }
  window.addEventListener("resize", resize);

  /**
   * 渲染数据（bar/line 自动判断）。
   * @param {Array<{label:string,value:number}>} data 适配后的数据
   * @param {Object} [options] 覆盖配置
   */
  function setData(data, options = {}) {
    const hasMultiple = data.some((d) => Array.isArray(d.value));
    const series = hasMultiple
      ? (options.series || [])
      : [{ type: options.type || "bar", data: data.map((d) => d.value) }];
    chart.setOption({
      tooltip: { trigger: "axis" },
      xAxis: { type: "category", data: data.map((d) => d.label) },
      yAxis: { type: "value" },
      series,
      ...options,
    });
  }

  function dispose() {
    window.removeEventListener("resize", resize);
    chart.dispose();
  }

  return { setData, dispose };
}
