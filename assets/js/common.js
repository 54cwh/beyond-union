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
  const items = NAV_ITEMS.map((item) => {
    const active = current === item.href.split("/").pop();
    return `<a href="${item.href}" class="${active ? "active" : ""} px-3 py-1.5 rounded-md text-sm transition-colors" style="${
      active
        ? "color:var(--color-accent);background:rgba(34,197,94,0.12);font-weight:600"
        : "color:var(--color-foreground);opacity:.65"
    }" onmouseover="this.style.opacity=1;this.style.background='rgba(255,255,255,0.06)'" onmouseout="this.style.opacity='.65';this.style.background='transparent'">${item.label}</a>`;
  }).join("");
  el.innerHTML = `
    <div class="flex items-center justify-between w-full">
      <div class="flex items-center gap-2 shrink-0">
        <span class="w-2 h-2 rounded-full inline-block" style="background:var(--color-accent)"></span>
        <span class="font-bold text-sm tracking-wide" style="color:var(--color-foreground)">北域绿联</span>
        <span class="text-xs" style="color:var(--color-foreground);opacity:.4">新能源入市决策平台</span>
      </div>
      <nav class="flex items-center gap-1">${items}</nav>
    </div>
  `;
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

// ===== 全局注入：AI 副驾驶壳 + 演示模式（E 集成岗，页面零改动）=====
// copilot.js / demo.js 被 import 即自执行（DOMContentLoaded 后注入），
// 页面无需任何改动即获得 AI 副驾驶壳与 window.__demo。

export { NAV_ITEMS, renderNav as Nav, loadData as Data, fetchData };
