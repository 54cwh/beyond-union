# 挑战杯 Demo

纯前端 + JSON 的本地数据展示 Demo，打包为单 EXE，无需服务器。

## 技术栈

- **样式**：Tailwind CSS v3.4（预编译）+ 视觉宪法 `design-system/MASTER.md`
- **前端**：Vue 3.4 全局版（Options API，无构建）+ ECharts 5.5
- **数据**：`data/*.json` + fetch（结构待定）
- **打包**：pywebview 双模式（GUI 默认 + `--web` 浏览器兜底）→ PyInstaller 单 EXE

## 快速开始

```bash
# 环境准备
uv sync
npm install
uv run playwright install chromium

# 开发预览（浏览器打开 http://127.0.0.1:8000/pages/p1.html）
uv run python -m http.server 8000

# 测试
npm test          # JS 纯函数单测（Vitest）
uv run pytest     # E2E + 契约测试（Playwright）
```

## 目录

```
pages/            5 个页面（p1 首页 ~ p5 结论）
assets/           公共资源（vendor 本地库 / common / 纯函数 js / tailwind 产物）
data/             数据 JSON（结构待定）
design-system/    视觉宪法 MASTER.md
tests/            E2E + 契约测试
scripts/          Tailwind 编译脚本
```

## 协作

项目为 5 人协作开发，**详细协作规则见 `协作说明.md`**（文件所有权表、Git 流程、测试体系、验收分工）。
