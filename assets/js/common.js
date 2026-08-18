// common.js —— 基础设施（E 维护，改须审批）
// 职责：导航渲染 + 数据加载 + 通用工具
// 不创建 Vue app；数据契约内容待定，Data 模块先提供通用接口

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
    const active = current === item.href.split("/").pop() ? ' class="active"' : "";
    return `<a href="${item.href}"${active}>${item.label}</a>`;
  }).join(" | ");
  el.innerHTML = items;
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

export { NAV_ITEMS, renderNav as Nav, loadData as Data, fetchData };
