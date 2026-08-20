// common.js —— 基础设施（E 集成岗维护）
// 职责：导航渲染 + 数据加载 + 通用工具 + 全局组件注入
// 不创建 Vue app；接口变更（导出/导航结构）须通知消费方

import './copilot.js';
import './demo.js';

// ===== 导航 =====
// 路径统一用项目根绝对路径（/pages/...、/data/...）：
// 页面在 /pages/ 下，相对路径会解析成 /pages/pages/... 导致 404。
const NAV_ITEMS = [
  { page: "p1", href: "/pages/p1.html", label: "运营工作台" },
  { page: "p2", href: "/pages/p2.html", label: "发电预测" },
  { page: "p3", href: "/pages/p3.html", label: "风光储优化" },
  { page: "p4", href: "/pages/p4.html", label: "绿电入市" },
  { page: "p5", href: "/pages/p5.html", label: "决策与政策" },
  { page: "p6", href: "/pages/p6.html", label: "经营成效" },
];

function renderNav() {
  const el = document.getElementById("site-nav");
  if (!el) return;
  const current = location.pathname.split("/").pop();
  // v3 导航：品牌标识 + 链接列表（active class 由 common.css 控制视觉）
  const items = NAV_ITEMS.map((item) => {
    const active = current === item.href.split("/").pop();
    return `<a href="${item.href}" class="${active ? "active" : ""}">${item.label}</a>`;
  }).join("");
  el.innerHTML = `
    <div class="nav-inner">
      <div class="nav-brand">
        <img class="nav-brand__logo" src="../assets/images/logo.png" alt="北域绿联">
        <span class="nav-brand__dot"></span>
        <span class="nav-brand__name">北域绿联</span>
        <span class="nav-brand__tag">新能源入市决策平台</span>
      </div>
      <nav class="nav-links">${items}</nav>
      <button type="button" class="nav-theme" id="nav-theme" title="切换日间/夜间模式" aria-label="切换主题">
        ${getTheme() === "dark" ? "☾ 夜间" : "☀ 日间"}
      </button>
    </div>
  `;
  const themeBtn = document.getElementById("nav-theme");
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const next = toggleTheme();
      themeBtn.textContent = next === "dark" ? "☾ 夜间" : "☀ 日间";
      // 若页面有地图等需要实时同步的主题组件，广播给消费方
      document.dispatchEvent(new CustomEvent("byu:themechange", { detail: { theme: next } }));
    });
  }
}

// ===== 数据（契约内容待定，先提供通用接口）=====
const _cache = {};

async function loadData(id) {
  // 读取 data/<id>.json（模拟数据在 data/demo/，由 A 数据岗产出）
  // 用项目根绝对路径 /data/，避免从 /pages/ 下相对解析成 /pages/data/
  if (_cache[id]) return _cache[id];
  const resp = await fetch(`/data/${id}.json`);
  if (!resp.ok) throw new Error(`数据加载失败: ${id} (${resp.status})`);
  _cache[id] = await resp.json();
  return _cache[id];
}

// ===== 通用工具 =====
async function fetchData(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`请求失败: ${url} (${resp.status})`);
  return resp.json();
}

// ===== 全局主题（全站日间/夜间模式） =====
// 规则：统一在 <html class="theme-dark"> 上挂 class，CSS 变量在 html.theme-dark 下覆盖，
//       所有使用 var(--color-*) 的组件（含各页面内联样式）自动跟随。
// 持久化：localStorage 键 'byu-theme'，跨页保持。
const THEME_KEY = "byu-theme";

function applyTheme(theme) {
  document.documentElement.classList.toggle("theme-dark", theme === "dark");
  document.documentElement.classList.toggle("theme-light", theme === "light");
}

export function getTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  return saved === "dark" ? "dark" : "light";
}

export function setTheme(theme) {
  applyTheme(theme);
  try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* 忽略存储异常 */ }
}

export function toggleTheme() {
  const next = getTheme() === "dark" ? "light" : "dark";
  setTheme(next);
  return next;
}

// 模块加载即应用持久化主题（页面零改动自动生效）
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => applyTheme(getTheme()));
  } else {
    applyTheme(getTheme());
  }
}

// ===== 全局注入：AI 副驾驶壳 + 演示模式（E 集成岗，页面零改动）=====
// copilot.js / demo.js 被 import 即自执行（DOMContentLoaded 后注入），
// 页面无需任何改动即获得 AI 副驾驶壳与 window.__demo。

export { NAV_ITEMS, renderNav as Nav, loadData as Data, fetchData };
