# Vendor 资产版本记录

## JS 库
| 资产 | 版本 | 下载 URL | 文件 |
|------|------|----------|------|
| vue.global.prod.js | 3.4.38 | https://unpkg.com/vue@3.4.38/dist/vue.global.prod.js | assets/vendor/vue.global.prod.js |
| echarts.min.js | 5.5.1 | https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js | assets/vendor/echarts.min.js |

## 字体（Inter，本地化）
| 资产 | 版本 | 下载 URL | 文件 |
|------|------|----------|------|
| Inter 400 | 5.3.0 | https://cdn.jsdelivr.net/npm/@fontsource/inter@5.3.0/files/inter-latin-400-normal.woff2 | assets/fonts/inter-latin-400-normal.woff2 |
| Inter 500 | 5.3.0 | …/inter-latin-500-normal.woff2 | assets/fonts/inter-latin-500-normal.woff2 |
| Inter 600 | 5.3.0 | …/inter-latin-600-normal.woff2 | assets/fonts/inter-latin-600-normal.woff2 |
| Inter 700 | 5.3.0 | …/inter-latin-700-normal.woff2 | assets/fonts/inter-latin-700-normal.woff2 |

> 中文字体用系统字体栈（Win=微软雅黑 / macOS=苹方 / Linux=Noto Sans CJK），不打包。

规则：
- 版本变更须走 E 审批
- 新增 vendor 文件在此登记
- 文件已入库，运行时不依赖 CDN
