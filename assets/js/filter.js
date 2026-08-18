// filter.js —— 纯函数聚合/筛选（C 维护，改须审批）
// 规则：无 DOM、无 import、自包含；禁止写死字段（数据契约待定）
// 数据契约待定：函数对任意 {字段:值} 记录数组通用

/**
 * 多维筛选记录。
 * @param {Array<Object>} records 记录数组
 * @param {Object} conditions 条件 {字段: 值或[min,max]}
 * @returns {Array<Object>} 过滤后的记录
 */
export function filterRows(records, conditions = {}) {
  return records.filter((row) =>
    Object.entries(conditions).every(([key, cond]) => {
      const val = row[key];
      if (cond === null || cond === undefined || cond === "") return true;
      if (Array.isArray(cond)) {
        // 数字区间 [min, max]（min/max 可空）
        const [min, max] = cond;
        if (typeof val !== "number") return true;
        if (min !== null && min !== undefined && val < min) return false;
        if (max !== null && max !== undefined && val > max) return false;
        return true;
      }
      if (Array.isArray(val)) return val.includes(cond);
      if (typeof val === "string") return val === String(cond);
      return val === cond;
    })
  );
}

/**
 * 按一个或多个维度分组聚合。
 * @param {Array<Object>} records 记录数组
 * @param {Array<string>|string} dims 分组维度（可多个）
 * @param {Array<Object>} aggs 聚合定义 [{field, as, fn}]
 * @returns {Array<Object>} [{...维度键, ...聚合结果, __count}]
 */
export function groupBy(records, dims, aggs = []) {
  const dimArr = Array.isArray(dims) ? dims : [dims];
  const map = new Map();
  for (const row of records) {
    const key = JSON.stringify(dimArr.map((d) => row[d]));
    if (!map.has(key)) {
      map.set(key, { __rows: [], __count: 0, __dims: dimArr.map((d) => row[d]) });
    }
    map.get(key).__rows.push(row);
    map.get(key).__count++;
  }
  const result = [];
  for (const entry of map.values()) {
    const out = {};
    dimArr.forEach((d, i) => (out[d] = entry.__dims[i]));
    out.__count = entry.__count;
    for (const agg of aggs) {
      out[agg.as || agg.field] = aggregateFn(agg.fn)(entry.__rows, agg.field);
    }
    result.push(out);
  }
  return result;
}

/**
 * 单指标聚合函数。
 * @param {string} fn sum|avg|count|min|max
 * @returns {Function}
 */
export function aggregateFn(fn) {
  const fns = {
    sum: (rows, f) => rows.reduce((s, r) => s + (Number(r[f]) || 0), 0),
    avg: (rows, f) => {
      const n = rows.filter((r) => r[f] !== null && r[f] !== undefined && r[f] !== "").length;
      if (n === 0) return 0;
      return rows.reduce((s, r) => s + (Number(r[f]) || 0), 0) / n;
    },
    count: (rows) => rows.length,
    min: (rows, f) => Math.min(...rows.map((r) => Number(r[f])).filter((v) => !isNaN(v))),
    max: (rows, f) => Math.max(...rows.map((r) => Number(r[f])).filter((v) => !isNaN(v))),
  };
  return fns[fn] || fns.count;
}

/**
 * 将 groupBy 聚合结果适配为图表数据 [{label, value}]。
 * 数据计算层（A 维护）统一提供，页面/展示层不写胶水代码。
 * @param {Array<Object>} groups groupBy 的输出
 * @param {string} labelField 标签字段（如维度 year）
 * @param {string} valueField 数值字段（如聚合结果的 total）
 * @returns {Array<{label: string|number, value: number}>}
 */
export function toChartData(groups, labelField, valueField) {
  return groups.map((g) => ({
    label: g[labelField],
    value: Number(g[valueField]) || 0,
  }));
}
