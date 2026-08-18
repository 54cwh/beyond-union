// common.js —— 基础设施（E 维护，改须审批）
// 职责：导航渲染 + 数据加载 + 通用工具
// 不创建 Vue app；数据契约内容待定，Data 模块先提供通用接口

// ===== 导航 =====
const NAV_ITEMS = [
  { page: "p1", href: "pages/p1.html", label: "首页" },
  { page: "p2", href: "pages/p2.html", label: "数据看板" },
  { page: "p3", href: "pages/p3.html", label: "组合查询" },
  { page: "p4", href: "pages/p4.html", label: "明细搜索" },
  { page: "p5", href: "pages/p5.html", label: "结论" },
];

function renderNav() {
  const el = document.getElementById("site-nav");
  if (!el) return;
  const current = location.pathname.split("/").pop();
  const items = NAV_ITEMS.map((item) => {
    const active = current === item.href.split("/").pop() ? ' class="active"' : "";
    return `<a href="${item.href}"${active}>${item.label}</a>`;
  }).join(" | ");
  el.innerHTML = items;
}

// ===== 数据（契约内容待定，先提供通用接口）=====
const _cache = {};

async function loadData(id) {
  // 数据契约待定：当前约定读取 data/<id>.json，结构确定后再细化
  if (_cache[id]) return _cache[id];
  const resp = await fetch(`data/${id}.json`);
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

export { NAV_ITEMS, renderNav as Nav, loadData as Data, fetchData };
