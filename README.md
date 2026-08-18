# 北域绿联 · beyond-union

东北新能源入市与多能协同智能决策平台 —— 新能源企业经营决策工作台（demo）。
让每一度新能源电力从"发出来"走向"算清楚、储得优、卖得好"。

纯前端 + JSON 的本地 Demo，打包为单 EXE，无需服务器。产品需求见 `docs/需求.md`。

## 技术栈

- **样式**：Tailwind CSS v3.4（预编译）+ 视觉宪法 `design-system/MASTER.md`
- **前端**：Vue 3.4 全局版（Options API，无构建）+ ECharts 5.5
- **数据**：`data/demo/*.json` 模拟数据集 + fetch（A 数据岗产出）
- **打包**：pywebview 双模式（GUI 默认 + `--web` 浏览器兜底）→ PyInstaller 单 EXE

## 快速开始

```bash
# 拉取仓库（SSH）
git clone git@github.com:54cwh/beyond-union.git
cd beyond-union

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
├── AGENTS.md                  给 AI 代理的项目速览（技术栈/铁律/分工）
├── app.py                    双模式启动器（GUI 默认 + --web 兜底）
├── template.html             标准页面骨架（6 页从它复制）
├── pyproject.toml / uv.lock  Python 依赖（uv 管理）
├── package.json              Node 依赖（Vitest）
├── tailwind.config.js        Tailwind v3 配置（content 扫描路径）
├── pages/                    6 个页面（p1 运营工作台 ~ p6 经营成效）
├── assets/
│   ├── common.css            视觉变量 + 字体 + 基础样式
│   ├── tailwind.css          预编译产物（scripts/build_tailwind.sh 生成）
│   ├── tailwind.src.css      Tailwind 输入源
│   ├── js/                   纯函数层（ESM，可单测）
│   │   ├── common.js         基础设施（导航 / 数据加载）
│   │   ├── chart-view.js     统一图表展示组件
│   │   ├── filter.js         筛选 / 聚合
│   │   ├── format.js         格式化
│   │   └── __tests__/        Vitest 单测
│   ├── vendor/               本地库（vue / echarts / VERSIONS.md）
│   └── fonts/                Inter 字体（本地化，离线可用）
├── data/                     数据 JSON（A 数据岗产出 data/demo/*.json 模拟数据）
├── design-system/MASTER.md   视觉宪法（B 维护）
├── 北域绿联.spec              PyInstaller 跨平台打包配置
├── scripts/
│   ├── build_exe.sh          打包 EXE（角色 E）
│   └── build_tailwind.sh     编译 Tailwind（样式归 B）
├── tests/                    pytest + Playwright
│   ├── conftest.py           测试服务器 fixture
│   ├── test_contract.py      共享契约测试
│   └── test_pX.py            每模块 E2E（p1 为示例）
└── docs/ 开工指南.md / 需求.md / 技术栈定案.md / 分工说明.md / 协作说明.md  公共文档（保姆级步骤/产品需求/技术决策/岗位分工/协作手册）
```

## 协作

项目为 5 人协作开发：
- **`docs/开工指南.md`** —— **保姆级开工步骤**（装工具→clone→建分支→开发→提交），**不熟 git 先看这个**
- **`docs/分工说明.md`** —— **岗位工作区**（每人分支/文件/文档）、职责、依赖、关键路径、里程碑
- **`docs/协作说明.md`** —— 执行规则（文件所有权表、Git 流程、测试体系、验收分工）
