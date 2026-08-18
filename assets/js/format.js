// format.js —— 纯函数格式化（A 数据岗维护）
// 规则：无 DOM、无 import、自包含

/**
 * 数字格式化：千分位 + 小数位。
 * @param {number|string} value
 * @param {number} [digits=0]
 * @returns {string}
 */
export function formatNumber(value, digits = 0) {
  if (value === null || value === undefined || value === "") return "--";
  const n = Number(value);
  if (isNaN(n)) return "--";
  return n.toLocaleString("zh-CN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/**
 * 金额格式化（人民币）。
 * @param {number|string} value
 * @returns {string}
 */
export function formatMoney(value) {
  if (value === null || value === undefined || value === "") return "--";
  const n = Number(value);
  if (isNaN(n)) return "--";
  return "¥" + formatNumber(n, 2);
}

/**
 * 百分比格式化。
 * @param {number|string} value 0-100 或 0-1
 * @param {number} [digits=1]
 * @returns {string}
 */
export function formatPercent(value, digits = 1) {
  if (value === null || value === undefined || value === "") return "--";
  const n = Number(value);
  if (isNaN(n)) return "--";
  const v = Math.abs(n) <= 1 ? n * 100 : n;
  return v.toFixed(digits) + "%";
}

/**
 * 日期格式化。
 * @param {string|number|Date} value
 * @returns {string}
 */
export function formatDate(value) {
  if (!value) return "--";
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return "--";
  return d.toLocaleDateString("zh-CN");
}
