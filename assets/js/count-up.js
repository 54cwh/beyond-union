// count-up.js —— KPI 数字滚动动画组件（B 展示岗维护）
// 职责：数字从 0（或上一值）缓动滚动到目标值，营造 dashboard「活数据」质感。
// 依赖：无外部依赖，仅需 Vue 全局构建已加载（vue.global.prod.js 含模板编译器）。
// 用法：app.component('count-up', CountUp)；
//       模板 <count-up :value="128.6" :decimals="1" prefix="¥" :duration="1000" />
// 规则：尊重 prefers-reduced-motion —— 用户偏好减弱动效时直接跳终值，不播放动画。

export const CountUp = {
  name: "CountUp",
  props: {
    value: { type: Number, default: 0 },
    decimals: { type: Number, default: 0 },
    prefix: { type: String, default: "" },
    suffix: { type: String, default: "" },
    duration: { type: Number, default: 1200 },
  },
  data() {
    return { display: 0 };
  },
  computed: {
    formatted() {
      const n = Number(this.display).toLocaleString("zh-CN", {
        minimumFractionDigits: this.decimals,
        maximumFractionDigits: this.decimals,
      });
      return this.prefix + n + this.suffix;
    },
  },
  mounted() {
    this.animate();
  },
  watch: {
    value() { this.animate(); },
  },
  methods: {
    animate() {
      const reduced = typeof window.matchMedia === "function"
        && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const from = this.display || 0;
      const to = Number(this.value) || 0;
      if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
      if (reduced || from === to) { this.display = to; return; }
      const dur = this.duration;
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
        this.display = from + (to - from) * eased;
        if (t < 1) {
          this._raf = requestAnimationFrame(tick);
        } else {
          this.display = to;
          this._raf = null;
        }
      };
      this._raf = requestAnimationFrame(tick);
    },
  },
  beforeUnmount() {
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
  },
  template: '<span class="count-up">{{ formatted }}</span>',
};
