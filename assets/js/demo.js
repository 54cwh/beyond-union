// 演示模式 —— 90-120 秒经营闭环演示（E 集成岗维护）
// 入口：window.__demo.start()（B 在 p1 的『开始演示』按钮调用，见技术栈定案.md）
// 演示故事（需求.md 二十节）：天气预报变化 → 风速下降 → 预测减少 → 预警
//   → 重新优化 → 储能调整 → 交易变化 → 偏差风险下降 → 确认方案 → 生成报告
// 事件总线：页面通过 __demo.on(fn) 订阅 {type:'start'|'step'|'pause'|'resume'|'done'|'stop', ...}，
//   供 p1 实时推演曲线（demo-stream.js）联动；不订阅则仅保留原 toast 行为。

let _demoTimer = null;
let _paused = false;
let _stepIndex = 0;
let _resumeAt = 0;
const _listeners = [];

const DEMO_STEPS = [
  { msg: "08/01 检测到天气预报变化：明日风速预计下降 18%…", wait: 1500 },
  { msg: "08/02 风力预测下调：明日发电 142.3 → 118.6 MWh…", wait: 1500 },
  { msg: "08/03 系统黄色预警：14:00—17:00 预测不确定性升高…", wait: 1500 },
  { msg: "08/04 触发重新优化：调整储能充放电计划…", wait: 1500 },
  { msg: "08/05 储能策略调整：提前至 11:20 充电，17:50 放电…", wait: 1500 },
  { msg: "08/06 交易组合变化：现货敞口 40% → 27%，中长期补足…", wait: 1500 },
  { msg: "08/07 预计偏差风险下降 32%，偏差成本降低约 3200 元…", wait: 1500 },
  { msg: "08/08 负责人确认方案，生成经营报告 ✅", wait: 800 },
];

function emit(type, payload) {
  _listeners.forEach((fn) => {
    try { fn(Object.assign({ type }, payload)); } catch (e) { console.error("[demo] 订阅回调异常", e); }
  });
}

function showDemoToast(msg, persist) {
  const old = document.getElementById("demo-toast");
  if (old) old.remove();
  const toast = document.createElement("div");
  toast.id = "demo-toast";
  Object.assign(toast.style, {
    position: "fixed",
    top: "70px",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: "80",
    background: "linear-gradient(135deg, #22C55E 0%, #15803C 100%)",
    color: "#FFFFFF",
    padding: "10px 20px",
    borderRadius: "10px",
    boxShadow: "0 8px 24px rgba(21,128,61,0.30)",
    fontSize: "14px",
    fontWeight: "600",
    maxWidth: "90vw",
    transition: "opacity 200ms ease",
  });
  toast.textContent = msg;
  document.body.appendChild(toast);
  if (!persist) {
    setTimeout(() => { toast.style.opacity = "0"; setTimeout(() => toast.remove(), 200); }, 1200);
  }
  return toast;
}

function runNext() {
  if (_stepIndex >= DEMO_STEPS.length) {
    showDemoToast("演示完成：预测 → 优化 → 交易 → 决策闭环已走通 ✅", true);
    setTimeout(() => {
      const t = document.getElementById("demo-toast");
      if (t) t.remove();
    }, 3000);
    _demoTimer = null;
    emit("done", {});
    return;
  }
  const s = DEMO_STEPS[_stepIndex];
  showDemoToast(s.msg, s.persist);
  emit("step", { index: _stepIndex, msg: s.msg, step: s });
  _stepIndex += 1;
  _resumeAt = s.wait;
  _demoTimer = setTimeout(runNext, _resumeAt);
}

function startDemo() {
  if (_demoTimer) return; // 已运行中（含暂停恢复前）不重复启动
  const cur = location.pathname.split("/").pop();
  if (cur !== "p1.html") {
    window.location.href = "/pages/p1.html?demo=1";
    return;
  }
  _paused = false;
  _stepIndex = 0;
  emit("start", {});
  runNext();
}

function stopDemo() {
  if (_demoTimer) { clearTimeout(_demoTimer); _demoTimer = null; }
  _paused = false;
  const t = document.getElementById("demo-toast");
  if (t) t.remove();
  emit("stop", {});
}

function pauseDemo() {
  if (!_demoTimer || _paused) return;
  clearTimeout(_demoTimer);
  _demoTimer = null;
  _paused = true;
  emit("pause", {});
}

function resumeDemo() {
  if (!_paused) return;
  _paused = false;
  _demoTimer = setTimeout(runNext, Math.max(0, _resumeAt));
  emit("resume", {});
}

function onDemo(fn) { _listeners.push(fn); return fn; }
function offDemo(fn) { const i = _listeners.indexOf(fn); if (i >= 0) _listeners.splice(i, 1); }
function isDemoRunning() { return !!_demoTimer && !_paused; }
function isDemoPaused() { return _paused; }

// 页面带 ?demo=1 进入时自动启动
function autoStartIfFlagged() {
  if (new URLSearchParams(location.search).get("demo") === "1") {
    setTimeout(startDemo, 400);
  }
}

export function initDemo() {
  window.__demo = {
    start: startDemo,
    stop: stopDemo,
    pause: pauseDemo,
    resume: resumeDemo,
    on: onDemo,
    off: offDemo,
    isRunning: isDemoRunning,
    isPaused: isDemoPaused,
  };
  autoStartIfFlagged();
}

// 模块加载即自执行（common.js import 时自动注入，页面零改动）
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDemo);
  } else {
    initDemo();
  }
}
