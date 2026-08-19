// provenance.js —— 数据溯源弹层（B 展示岗维护）
// 职责：渲染「【查看数据来源】」弹层，展示需求.md 原则3 的 7 字段
// （数据名称/数据来源/更新时间/数据质量/原始数据/处理方法/模型版本）。
// 纯 DOM 组件，不使用 ECharts；只展示溯源信息，不生成溯源数据。

function esc(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function renderRow(label, value) {
  if (!value) return "";
  return `<div class="provenance-row"><span class="provenance-row__label">${label}</span><span class="provenance-row__value">${esc(value)}</span></div>`;
}

function renderSources(sources) {
  if (!Array.isArray(sources) || sources.length === 0) return "";
  return renderRow("数据来源", sources.map(esc).join(" + "));
}

function renderModel(model) {
  if (!model || (!model.name && !model.version)) return "";
  const text = model.version ? `${model.name} ${model.version}` : model.name;
  return renderRow("模型版本", text);
}

function render(data) {
  return `
<div class="provenance-overlay">
  <div class="provenance-modal" role="dialog" aria-label="查看数据来源">
    <div class="provenance-modal__head">
      <h3 class="provenance-modal__title">查看数据来源</h3>
      <button type="button" class="provenance-close" data-action="close" aria-label="关闭">&times;</button>
    </div>
    <div class="provenance-modal__body">
      ${renderRow("数据名称", data.name)}
      ${renderSources(data.sources)}
      ${renderRow("更新时间", data.updateTime)}
      ${renderRow("数据质量", data.quality)}
      ${renderRow("原始数据", data.raw)}
      ${renderRow("处理方法", data.process)}
      ${renderModel(data.model)}
    </div>
  </div>
</div>`;
}

export function createProvenance(el) {
  function onClick(event) {
    const target = event && event.target;
    if (!target) return;
    const action = (target.dataset && target.dataset.action) ||
      (target.getAttribute && target.getAttribute("data-action"));
    const isBackdrop = target.classList && target.classList.contains("provenance-overlay");
    if (action === "close" || isBackdrop) close();
  }

  el.addEventListener("click", onClick);

  function open(data = {}) {
    el.innerHTML = render(data);
  }

  function close() {
    el.innerHTML = "";
  }

  function dispose() {
    el.removeEventListener("click", onClick);
    el.innerHTML = "";
  }

  return { open, close, dispose };
}
