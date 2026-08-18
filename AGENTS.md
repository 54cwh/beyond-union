# AGENTS.md —— 给 AI 代理的项目速览

> 本文件是所有成员 AI 的**第一参考**：项目是什么、怎么跑、铁律是什么、文档在哪。
> 详细规则见 `docs/` 下四份文档；本文件只列最关键的约束，避免 AI 犯错。

---

## 项目是什么

**北域绿联（beyond-union）** —— 东北新能源入市与多能协同智能决策平台 demo。
"新能源企业经营决策工作台"：让企业在平台里完成"预测→优化→交易→决策→验证"闭环，不是数据大屏。

- 纯前端 + JSON，本地运行，无服务器
- 打包为单 EXE（pywebview 双模式），可离线
- 产品需求：`docs/需求.md`

## 技术栈（锁死，禁止换）

| 层 | 选择 | 铁律 |
|----|------|------|
| 样式 | Tailwind CSS **v3.4**（预编译）| 禁 v4 语法；改 class 后跑 `scripts/build_tailwind.sh` |
| JS 框架 | Vue 3.4 **全局版** | 只写 **Options API**；**禁 `setup()`、禁 `import Vue`、禁 SFC(.vue)** |
| 图表 | ECharts 5.5（本地文件）| **禁直接 `echarts.init`**，统一走 `chart-view.js` |
| 数据 | `data/demo/*.json` + fetch | 数据文件归 A 数据岗产出 |
| 打包 | pywebview 双模式 + PyInstaller | **打包是最后一步**，开发/验收走 web |

## 常用命令

```bash
uv sync                      # 装 Python 依赖（清华镜像，uv 管理）
npm install                  # 装 Node 依赖（Vitest）
uv run python -m http.server 8000   # 开发预览 → http://127.0.0.1:8000/pages/p1.html
uv run python app.py --web   # 双模式启动器（web 模式）
npm test                     # JS 纯函数单测
uv run pytest                # E2E + 契约测试
uv run ruff check .          # Python 规范
bash scripts/build_tailwind.sh  # 编译 Tailwind（改 class 后必跑）
```

## 铁律（AI 最容易犯的错）

1. **禁止本机绝对路径**：不写 `/home/xxx/`、`C:\...`、`/mnt/`。页面内引用共享资源用 `../assets/`；导航/数据加载用根路径 `/pages/`、`/data/`（common.js 已示范）
2. **计算逻辑放 A 的计算层**：筛选/聚合/格式化用 `assets/js/filter.js`、`format.js`，**禁止在页面/Vue 里自写**；缺功能向 A 提
3. **图表走 B 的组件**：`chart-view.js` 统一封装；页面传数据、不碰 echarts API
4. **全局组件只由 E/B 提供**：Copilot 壳/问答库归 E，可信 AI 卡片/溯源组件归 B；页面是消费者
5. **领域自治**：只改自己岗位工作区的文件；改**接口**（函数签名/字段/导出）须同步文档并通知消费方
6. **文档先行**：页面/数据/组件开工前先写对应设计说明（见 `docs/分工说明.md` 岗位文档职责）

## 目录结构

```
app.py              双模式启动器（GUI 默认 + --web）
template.html       标准页面骨架（页面从它复制）
pages/p1~p6.html    6 个页面
assets/js/          纯函数/组件（common、chart-view、filter、format + __tests__）
assets/vendor/      本地库（vue/echarts）+ VERSIONS.md
assets/fonts/       Inter 字体（本地化）
data/               数据（A 产出 data/demo/ + CONTRACT.md）
docs/               公共文档（需求/技术栈定案/分工说明/协作说明）
design-system/      MASTER.md 视觉宪法（B 维护）
scripts/            打包/编译脚本
tests/              pytest + Playwright
北域绿联.spec        PyInstaller 跨平台配置
```

## 文档导航

| 文档 | 作用 |
|------|------|
| `docs/需求.md` | 产品需求（12 页 → 6 页）|
| `docs/技术栈定案.md` | 技术决策、锁死细则、版本表、待建清单 |
| `docs/分工说明.md` | **岗位工作区**（每人分支/文件/文档）、依赖、里程碑 |
| `docs/协作说明.md` | 文件所有权、Git 流程、测试、验收 |
| `design-system/MASTER.md` | 视觉宪法（配色/字体/风格）|
| `README.md` | 项目介绍 |

## 5 人分工速查

| 成员 | 岗位 | 页面 | 分支 |
|------|------|------|------|
| A | 数据岗 | p6 经营成效 | feature/a |
| B | 展示岗 | p1 运营工作台 | feature/b |
| C | 前端 | p4 绿电入市（核心）| feature/c |
| D | 前端 | p2+p3 预测/优化 | feature/d |
| E | 集成 | p5 决策政策 + 打包 | feature/e |

**开工第一步**：读 `docs/分工说明.md` 的"岗位工作区"，只动自己地盘的文件。
