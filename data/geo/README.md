# 地理信息数据库（data/geo/）

区域经营地图的静态数据层。前端经 `assets/js/geo-db.js` 加载与查询，页面不直接碰 JSON。
所有 JSON 均由脚本/人工生成（见下方「更新方式」），**当前无后端、无 PostGIS**（原因见文末）。

## 文件清单

| 文件 | 内容 | 更新频率 |
| --- | --- | --- |
| ne.json | 东北四省 GeoJSON（FeatureCollection，adcode 150000/210000/220000/230000） | 边界更新时 |
| provinces.json | 省份经营 KPI + 资源禀赋（容量/发电/收益/风险/风速/辐照/储能/场站数/质心） | 每日 |
| stations.json | 13 个风/光/储场站（坐标/容量/状态/型号） | 新增项目时 |
| flows.json | 5 条输电流向（起止省、功率、外送标注） | 交易计划更新时 |

## provinces.json（省份）

数组项字段（`{ "provinces": [ ... ] }`）：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| adcode | string | 行政区划码（150000 内蒙古 / 210000 辽宁 / 220000 吉林 / 230000 黑龙江） |
| name | string | 全称（黑龙江省） |
| short | string | 短名（黑龙江），地图 tooltip 与查询用 |
| center | number[] | 质心 [lng, lat]，输电流向起终点用 |
| capacity | number | 装机容量（GW） |
| generation | number | 今日发电（MWh） |
| revenue | number | 经营收益（万元） |
| risk | string | 风险等级：低 / 中低 / 中 |
| riskLevel | number | 风险档位（1 低 → 3 中） |
| wind / solar | number | 平均风速（m/s）/ 太阳能辐射（kWh/㎡） |
| storage | number | 储能规模（MWh） |
| stationCount | number | 场站数 |
| history | number[] | 近 7 期每日发电序列（时间轴气泡图层取值，末位 == generation） |
| periods（顶层） | string[] | 时间轴期标签（如 08-12 … 08-18），geo-db 经 `periods` 暴露 |

## stations.json（场站）

数组项字段（`{ "stations": [ ... ] }`）：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 场站编码（HLJ-01 等） |
| name | string | 场站名 |
| type | string | wind / solar / storage |
| province | string | 所属省（短名） |
| city | string | 地市 |
| lng / lat | number | 坐标 |
| capacity | number | 装机（MW；储能场站为 MWh） |
| status | string | 运行 / 在建 |
| model | string | 机型/设备型号 |

## flows.json（输电流向）

数组项字段（`{ "flows": [ ... ] }`）：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 流向编码（FL-01 等） |
| from / to | string | 起/终点省（短名；to 可为华北等区域名） |
| label | string | 通道名（蒙东外送辽宁） |
| value | number | 输送功率（MW） |
| type | string | 类型（省间外送 / 区内调配） |
| toCoord | number[] | 可选：终点显式坐标（外送省外时覆盖 to 质心） |

## 查询接口（assets/js/geo-db.js）

```js
const db = await loadGeoDB();       // baseUrl 缺省为站点根；p1 传 "../"
db.stationsByProvince("吉林");       // 省份 → 场站列表
db.stationsByType("wind");          // 类型 → 场站列表
db.searchStations("通辽");          // 名称/城市/省份/类型模糊搜索
db.stationTotals();                 // 按省份聚合（容量合计 + 场站数，复用 filter.js groupBy）
db.resolveFlows();                  // 流向 → 起终点坐标（供 geo-map.js）
db.provinceByName("辽宁");           // 短名/全称 → 省份对象
```

## 渲染：assets/js/geo-map.js

`createGeoMap(el, { geoJson, provinces, stations, flows, periods })` 八图层 + 双主题 + 省份联动 + 时间轴：

- **KPI 着色**：capacity / generation / revenue 连续色带（#DCFCE7→#16A34A），risk 分档色（低=绿 / 中低=琥珀 / 中=红）
- **资源图层**：wind（风速）/ solar（辐照）连续着色
- **场站分布**：scatter / effectScatter（储能脉冲），符号大小 = √容量，点击回调
- **夜间模式**：setTheme("dark") 切换暗色发光主题（深空蓝底 + 光晕 + lighter 混合），p1 工具栏一键切换
- **省份联动**：点击省份 → 顶部核心数字 KPI 切到该省，点「当前视角」返回全景
- **查询 API**：geo-db.js 提供 provinceByName / stationsByProvince / searchStations / stationTotals / resolveFlows（含单测）
- **输电流向**：lines 轨迹 + 流动箭头（resolveFlows 解析坐标）
- **发电热力**：scatter 热力（符号 = √发电量，发光光晕）
- **场站关联**：lines 关联线（场站 → 本省汇聚，线宽 ∝ 容量，按类型着色 + 流动箭头）
- **时间轴气泡**：省份质心气泡 ∝ 各期发电，随 `periods` 播放（playTime/setTime），工具栏「播放/暂停 + 日期按钮」
- **3D 柱状**：ECharts GL `bar3D` 省份质心立体柱（高度 = KPI，需 `assets/vendor/echarts-gl.min.js`）

## 更新方式

- 边界（ne.json）：`https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json` 下载后裁切为四省。
- KPI/资源（provinces.json）：每日从数据管线导出（A 岗）后按上方字段覆写。
- 场站（stations.json）：新建项目时追加一行。

## 为什么当前不用 PostGIS

地图的"精美"来自前端渲染（ECharts 分层样式/色带/tooltip），PostGIS 是**服务端空间数据库**，
解决的是空间**查询与分析**（如「50km 半径内场站」「电网拓扑相交」），它不会让地图本身更美观。

当前数据规模（4 省、13 场站、5 流向、纯静态展示）用 JSON 数据层已完全够用，且：

- 无需起后端，`python -m http.server` 即可演示，符合竞赛演示场景；
- 数据层已抽象（geo-db.js 统一查询入口），未来切 PostGIS 时只需把 `loadGeoDB` 换成 API 拉取，前端零改动。

何时再引入 PostGIS：真正上线做**实时数据 + 多用户 + 空间分析**（如并网位置合规校验、区域聚合统计）时，
届时数据层从 JSON 文件切到 `GET /api/geo/...` 即可，GeoJSON 仍由服务端生成。
