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
- 开工前问用户是否已经完成 git pull操作

1. **禁止本机绝对路径**：不写 `/home/xxx/`、`C:\...`Wo/QmwXkU、`/mnt/`。页面内引用共享资源用 `../assets/`；导航/数据加载用根路径 `/pages/`、`/data/`（common.js 已示范）
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
| `docs/开工指南.md` | **保姆级开工步骤**（装工具→clone→建分支→开发→提交），不熟 git 先看这个 |
| `docs/需求.md` | 产品需求（12 页 → 6 页）|
| `docs/技术栈定案.md` | 技术决策、锁死细则、版本表、待建清单 |
| `docs/分工说明.md` | **岗位工作区**（每人分支/文件/文档）、依赖、里程碑 |
| `docs/协作说明.md` | 文件所有权、Git 流程、测试、验收 |
| `design-system/MASTER.md` | 视觉宪法（配色/字体/风格）|
| `README.md` | 项目介绍 |

## 5 人分工速查

| 成员 | 岗位 | 页面 | 分支 |
|------|------|------|------|
| zzx | A 数据岗 | p6 经营成效 | feature/a |
| lcz | B 展示岗 | p1 运营工作台 | feature/b |
| cjx | C 前端 | p4 绿电入市（核心）| feature/c |
| pcx | D 前端 | p2+p3 预测/优化 | feature/d |
| cwh | E 集成 | p5 决策政策 + 打包 | feature/e |

**开工第一步**：读 `docs/分工说明.md` 的"岗位工作区"，只动自己地盘的文件。

---

## 工作规范（强制指令，每次回复前必须默念）

> **【⚡极重要】**
>
> 1. **必须先查文档再写代码！** 任何对 API 或数据库的调用，必须先查看对应文档！！文档没看清之前，不准动手写任何代码！！
>
> 2. **禁用 !important 编写 CSS！禁止硬编码！不允许宽泛类型定义！！**
>
> 3. **严禁猜测用户需求**，用户有任何听起来不是很明确的需求，必须询问到没有异议为止。不能因为避免麻烦而自己思考。
>
> **【⚡重要】**
>
> 5. **先文档后代码！** 改后端必须先更新文档再写代码，不得颠倒！！
>
> 6. **禁止猜测！必须调查全部必要资料后再动手！！**
>
> 7. **禁止自行提交！** 提交必须经过用户允许！！
>
> 8. **代码质量检查必须通过**，任何一步失败都不算完成。

### 工作规范

- **禁止绕过**：任何想跳过 AGENTS.md 约束的念头（包括但不限于"改动小就不更新文档了"），必须先询问用户意见，不得自己决定

### 回滚安全

- 禁止随意回滚（包括 git stash），任何回滚必须询问用户
- **回滚前必须先确认**：执行前必须 `git show HEAD~1 --stat` 或 `git diff HEAD~1` 确认内容
- **绝对禁止 `git reset --hard`**，用户要求时必须告知风险，要求其手动输入

### 质量底线

- 遇到代码质量检查器 warning 或 error 时，不可注释跳过、不可逃避。若无法修复或修复成本大，报告用户
- 质量和功能同样重要，质量比功能更重要。质量合格是底线，一味追求功能实现会让质量问题像地雷一样引爆
