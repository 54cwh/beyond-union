// copilot.js —— 全局 AI 副驾驶壳（E 集成岗维护）
// 职责：右侧固定 AI 面板，提问 → ai-qa.js 匹配 → 结构化回答渲染
// 由 common.js 统一注入，页面零改动；不依赖 Vue（纯 DOM）
// AI 为模拟：预置问答库（ai-qa.js），非真模型

import { askAI, SUGGESTIONS } from './ai-qa.js';

let _open = false;
let _panelEl = null;

const CSS_ID = "copilot-style";

function injectStyle() {
  if (document.getElementById(CSS_ID)) return;
  const css = `
    #copilot-btn {
      position: fixed;
      right: 20px;
      bottom: 24px;
      z-index: 60;
      width: 52px;
      height: 52px;
      border-radius: 50%;
      border: none;
      background: linear-gradient(135deg, #22C55E 0%, #15803C 100%);
      color: #fff;
      font-size: 22px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(34,197,94,0.35);
      transition: transform 200ms ease, box-shadow 200ms ease;
    }
    #copilot-btn:hover {
      transform: scale(1.06);
      box-shadow: 0 6px 22px rgba(34,197,94,0.45);
    }
    #copilot-panel {
      position: fixed;
      right: 20px;
      bottom: 88px;
      z-index: 60;
      width: 380px;
      max-width: calc(100vw - 40px);
      height: 560px;
      max-height: calc(100vh - 120px);
      background: #FFFFFF;
      border: 1px solid #BBF7D0;
      border-radius: 16px;
      box-shadow: 0 12px 40px rgba(21,128,61,0.18);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transform: translateY(8px);
      opacity: 0;
      pointer-events: none;
      transition: transform 220ms ease, opacity 220ms ease;
    }
    #copilot-panel.open {
      transform: translateY(0);
      opacity: 1;
      pointer-events: auto;
    }
    .copilot-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      border-bottom: 1px solid #BBF7D0;
      background: linear-gradient(135deg, #F0FDF4 0%, #FFFFFF 100%);
    }
    .copilot-head__title {
      font-weight: 700;
      font-size: 14px;
      color: #14532D;
      background: linear-gradient(135deg, #16A34A 0%, #14532D 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .copilot-close {
      border: none;
      background: none;
      cursor: pointer;
      font-size: 18px;
      color: #14532D;
      opacity: 0.5;
      line-height: 1;
    }
    .copilot-close:hover { opacity: 1; }
    .copilot-body {
      flex: 1;
      overflow-y: auto;
      padding: 14px 16px;
    }
    .copilot-sugg {
      font-size: 12px;
      padding: 8px 12px;
      border-radius: 10px;
      border: 1px solid #BBF7D0;
      background: #F0FDF4;
      color: #166534;
      cursor: pointer;
      margin-bottom: 8px;
      transition: all 160ms ease;
      text-align: left;
      width: 100%;
    }
    .copilot-sugg:hover {
      border-color: #22C55E;
      background: #FFFFFF;
      box-shadow: 0 2px 8px rgba(34,197,94,0.10);
    }
    .copilot-answer {
      font-size: 13px;
      color: #14532D;
      line-height: 1.65;
    }
    .copilot-answer__conclusion {
      font-size: 15px;
      font-weight: 700;
      margin-bottom: 8px;
      background: linear-gradient(135deg, #16A34A 0%, #14532D 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .copilot-answer__section {
      font-size: 11px;
      font-weight: 600;
      color: #16A34A;
      margin: 10px 0 4px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .copilot-answer li {
      margin-left: 16px;
      list-style: disc;
      margin-bottom: 2px;
    }
    .copilot-conf {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 10px;
      font-size: 12px;
      color: #15803C;
      background: #F0FDF4;
      border: 1px solid #BBF7D0;
      border-radius: 999px;
      padding: 4px 12px;
    }
    .copilot-meta {
      font-size: 11px;
      color: #94A3B8;
      margin-top: 10px;
      border-top: 1px dashed #BBF7D0;
      padding-top: 8px;
    }
    .copilot-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 12px;
    }
    .copilot-act {
      font-size: 12px;
      padding: 6px 12px;
      border-radius: 8px;
      border: none;
      background: linear-gradient(135deg, #22C55E 0%, #15803C 100%);
      color: #fff;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(34,197,94,0.25);
      transition: opacity 160ms ease;
    }
    .copilot-act:hover { opacity: 0.88; }
    .copilot-foot {
      display: flex;
      gap: 8px;
      padding: 12px 16px;
      border-top: 1px solid #BBF7D0;
      background: #F8FAFC;
    }
    #copilot-input {
      flex: 1;
      border: 1px solid #BBF7D0;
      border-radius: 10px;
      padding: 8px 12px;
      font-size: 13px;
      color: #14532D;
      background: #FFFFFF;
      outline: none;
    }
    #copilot-input:focus { border-color: #22C55E; box-shadow: 0 0 0 3px rgba(34,197,94,0.12); }
    #copilot-send {
      border: none;
      border-radius: 10px;
      padding: 0 16px;
      background: linear-gradient(135deg, #22C55E 0%, #15803C 100%);
      color: #fff;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(34,197,94,0.25);
    }
    #copilot-send:hover { opacity: 0.9; }
  `;
  const style = document.createElement("style");
  style.id = CSS_ID;
  style.textContent = css;
  document.head.appendChild(style);
}

function renderAnswer(answer) {
  const reasons = (answer.reasons || []).map((r) => `<li>${r}</li>`).join("");
  const sources = (answer.dataSources || []).map((s) => `${s.source}(${s.time})`).join(" · ");
  const actions = (answer.actions || []).map(
    (a) => `<button class="copilot-act" data-act="${a.value}">${a.label}</button>`
  ).join("");

  return `
    <div class="copilot-answer">
      <div class="copilot-answer__conclusion">${answer.conclusion}</div>
      ${reasons ? `<div class="copilot-answer__section">推荐原因</div><ul>${reasons}</ul>` : ""}
      ${answer.impact ? `<div class="copilot-answer__section">预计影响</div><div>${answer.impact}</div>` : ""}
      <div class="copilot-conf">置信度 ${answer.confidence}%</div>
      ${sources ? `<div class="copilot-meta">依据：${sources} · 模型 ${answer.model.name} v${answer.model.version}</div>` : ""}
      ${actions ? `<div class="copilot-actions">${actions}</div>` : ""}
    </div>
  `;
}

function answerQuestion(q) {
  const body = document.getElementById("copilot-body");
  if (!body) return;
  body.innerHTML = renderAnswer(askAI(q));
  body.querySelectorAll(".copilot-act").forEach((btn) => {
    btn.addEventListener("click", () => handleAction(btn.getAttribute("data-act")));
  });
}

function handleAction(value) {
  const map = {
    "go-p2": "/pages/p2.html",
    "go-p3": "/pages/p3.html",
    "go-p4": "/pages/p4.html",
    "go-p5": "/pages/p5.html",
    "go-p6": "/pages/p6.html",
  };
  if (map[value]) {
    window.location.href = map[value];
  } else if (value === "re-simulate") {
    const body = document.getElementById("copilot-body");
    if (body) body.innerHTML = `<div class="copilot-answer"><div>（演示）已触发重新模拟，模型重新计算中…</div></div>`;
  } else if (value === "explain-rule") {
    answerQuestion("吉林有哪些现货交易规则");
  }
}

export function initCopilot() {
  injectStyle();

  // 悬浮按钮
  const btn = document.createElement("button");
  btn.id = "copilot-btn";
  btn.textContent = "AI";
  btn.title = "北域AI副驾驶";
  document.body.appendChild(btn);

  // 面板
  const panel = document.createElement("div");
  panel.id = "copilot-panel";
  panel.innerHTML = `
    <div class="copilot-head">
      <span class="copilot-head__title">北域 AI 副驾驶</span>
      <button class="copilot-close" id="copilot-close">✕</button>
    </div>
    <div class="copilot-body" id="copilot-body">
      <div class="copilot-answer">
        <div class="copilot-answer__conclusion">您好，我是北域 AI 副驾驶</div>
        <div class="copilot-answer__section">您可以这样问我</div>
        <div style="margin-top:8px">
          ${SUGGESTIONS.map((s) => `<button class="copilot-sugg">${s}</button>`).join("")}
        </div>
      </div>
    </div>
    <div class="copilot-foot">
      <input id="copilot-input" placeholder="输入问题，例如：为什么建议降低现货比例？" />
      <button id="copilot-send">发送</button>
    </div>
  `;
  document.body.appendChild(panel);

  const toggle = () => {
    _open = !_open;
    panel.classList.toggle("open", _open);
    if (_open) {
      const input = document.getElementById("copilot-input");
      if (input) input.focus();
    }
  };

  btn.addEventListener("click", toggle);
  document.getElementById("copilot-close").addEventListener("click", toggle);

  // 快捷问题
  panel.querySelectorAll(".copilot-sugg").forEach((el) => {
    el.addEventListener("click", () => {
      answerQuestion(el.textContent);
      const input = document.getElementById("copilot-input");
      if (input) input.value = el.textContent;
    });
  });

  // 发送
  const send = () => {
    const input = document.getElementById("copilot-input");
    const q = (input.value || "").trim();
    if (!q) return;
    answerQuestion(q);
  };
  document.getElementById("copilot-send").addEventListener("click", send);
  document.getElementById("copilot-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") send();
  });

  _panelEl = panel;
}

export function disposeCopilot() {
  if (_panelEl) { _panelEl.remove(); _panelEl = null; }
  const btn = document.getElementById("copilot-btn");
  if (btn) btn.remove();
  const style = document.getElementById(CSS_ID);
  if (style) style.remove();
}

// 模块加载即自执行（common.js import 时自动注入，页面零改动）
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCopilot);
  } else {
    initCopilot();
  }
}
