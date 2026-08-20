// ai-card.js —— 可信 AI 八要素卡片（B 展示岗维护）
// 职责：渲染「可解释、可追溯、可人工确认」的 AI 建议卡片。
// 纯 DOM 组件，不使用 ECharts；只渲染、不生成建议（建议内容由 E 的 ai-qa.js 产出）。
// 接口契约见同目录 ai-card.md，视觉 token 见 design-system/MASTER.md，样式落地 assets/common.css。

const DEFAULT_RISK = "基于 MarketDecision 1.2 模型 · 置信度 87%";
const DEFAULT_ACTIONS = [
  { label: "查看依据", value: "view-evidence" },
  { label: "加入任务", value: "add-task" },
  { label: "重新模拟", value: "re-simulate" },
];
const CIRCLED = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩"];

// 转义用户数据，防 HTML 注入
function esc(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function reasonIndex(i) {
  return CIRCLED[i] || `${i + 1}.`;
}

function renderReasons(reasons) {
  if (!Array.isArray(reasons) || reasons.length === 0) return "";
  const items = reasons
    .map((r, i) => `<li>${reasonIndex(i)} ${esc(r)}</li>`)
    .join("");
  return `<div class="ai-card__section-label">推荐原因</div><ul class="ai-card__reasons">${items}</ul>`;
}

function renderModel(model) {
  if (!model || (!model.name && !model.version)) return "";
  const name = model.name ? esc(model.name) : "";
  const version = model.version ? esc(model.version) : "";
  const text = version ? `${name} ${version}` : name;
  return `<div class="ai-card__meta">模型：${text}</div>`;
}

function renderDataSources(dataSources) {
  if (!Array.isArray(dataSources) || dataSources.length === 0) return "";
  const parts = dataSources
    .map((d) => `${esc(d && d.source)} ${esc(d && d.time)}`)
    .join(" · ");
  return `<div class="ai-card__meta">数据：${parts}</div>`;
}

function renderActions(actions) {
  const list = (Array.isArray(actions) && actions.length > 0) ? actions : DEFAULT_ACTIONS;
  const btns = list
    .map((a) => `<button type="button" class="ai-card__btn" data-value="${esc(a.value)}">${esc(a.label)}</button>`)
    .join("");
  return `<div class="ai-card__actions">${btns}</div>`;
}

function render(data, options, actions) {
  const pending = options.pending !== false;
  const confidence = Math.max(0, Math.min(100, Number(data.confidence) || 0));
  const badge = pending ? `<span class="ai-card__badge">待人工确认</span>` : "";
  const conclusion = `<h3 class="ai-card__conclusion">${esc(data.conclusion)}</h3>`;
  const impact = data.impact ? `<p class="ai-card__impact">${esc(data.impact)}</p>` : "";
  const riskNote = data.riskNote || DEFAULT_RISK;
  const provenance = (data.provenance && data.provenance.text)
    ? `<div class="ai-card__provenance">
        <span class="ai-card__provenance-label">技术来源</span>
        <span class="ai-card__provenance-text">${esc(data.provenance.text)}</span>
        <button type="button" class="ai-card__provenance-btn" data-value="view-evidence">查看依据</button>
      </div>`
    : "";
  return `
<div class="ai-card">
  <div class="ai-card__head">${badge}</div>
  ${conclusion}
  ${impact}
  <div class="ai-card__confidence">
    <span class="ai-card__confidence-label">置信度</span>
    <div class="ai-card__bar"><div class="ai-card__bar-fill" style="width:${confidence}%"></div></div>
    <span class="ai-card__confidence-value">${confidence}%</span>
  </div>
  ${renderReasons(data.reasons)}
  ${renderModel(data.model)}
  ${renderDataSources(data.dataSources)}
  <div class="ai-card__risk">${esc(riskNote)}</div>
  ${provenance}
  ${renderActions(actions)}
</div>`;
}

export function createAICard(el) {
  let currentActions = DEFAULT_ACTIONS;
  let currentOnAction = null;

  function onClick(event) {
    const target = event && event.target;
    if (!target) return;
    const value = (target.dataset && target.dataset.value) ||
      (target.getAttribute && target.getAttribute("data-value"));
    if (!value) return;
    const action = currentActions.find((a) => a.value === value);
    if (action && typeof currentOnAction === "function") {
      currentOnAction({ label: action.label, value });
    }
  }

  el.addEventListener("click", onClick);

  function setData(data = {}, options = {}) {
    const actions = (Array.isArray(data.actions) && data.actions.length > 0)
      ? data.actions : DEFAULT_ACTIONS;
    currentActions = actions;
    currentOnAction = typeof options.onAction === "function" ? options.onAction : null;
    el.innerHTML = render(data, options, actions);
  }

  function dispose() {
    el.removeEventListener("click", onClick);
    el.innerHTML = "";
    currentOnAction = null;
    currentActions = DEFAULT_ACTIONS;
  }

  return { setData, dispose };
}
