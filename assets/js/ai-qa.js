// ai-qa.js —— AI 问答库（E 集成岗维护）
// 职责：预置问答 + 关键词匹配，产出「可信 AI 建议」（八要素结构，见 ai-card.md）
// 被 copilot.js 调用；AI 为模拟（预置数据，非真模型），见技术栈定案.md

// 问题分类 + 关键词 → 回答模板
// 顺序即优先级：更具体/更长的关键词规则放前面（如『政策』先于『现货』）
const QA_RULES = [
  {
    key: "政策",
    keywords: ["政策", "规则", "交易规则", "吉林", "现货规则"],
    answer: {
      conclusion: "吉林省电力现货市场交易规则已进入试运行，影响中长期与现货交易比例",
      confidence: 95,
      reasons: [
        "吉林现货交易 4 条政策，涉及中长期、日前、实时市场",
        "市场交易影响评级五星，需关注偏差考核条款",
        "建议优先用中长期锁定基础电量，降低现货暴露",
      ],
      impact: "中长期比例建议上调至 72%，现货降至 28%",
      model: { name: "PolicyRAG", version: "1.1" },
      dataSources: [
        { source: "政策库", time: "08:00" },
        { source: "吉林省能源局公告", time: "2024-06" },
      ],
      riskNote: "基于 PolicyRAG 1.1 模型 · 置信度 95%",
      actions: [
        { label: "查看政策原文", value: "go-p5" },
        { label: "AI 解释规则", value: "explain-rule" },
      ],
    },
  },
  {
    key: "现货",
    keywords: ["现货", "敞口", "中长期", "交易比例", "怎么卖"],
    answer: {
      conclusion: "建议明日现货敞口从 40% 降至 27%",
      confidence: 87,
      reasons: [
        "14:00—18:00 风速预测下降 18%，出力波动加大",
        "风功率预测置信区间扩大，偏差风险上升",
        "当前中长期合同仍有剩余容量 65MWh 可优先锁定",
        "储能可调能力仅 18.2MWh，调节余量有限",
      ],
      impact: "预计偏差成本下降约 3200 元，收益波动收窄",
      model: { name: "MarketDecision", version: "1.2" },
      dataSources: [
        { source: "气象更新", time: "15:30" },
        { source: "SCADA 更新", time: "15:40" },
        { source: "市场数据更新", time: "15:35" },
      ],
      riskNote: "基于 MarketDecision 1.2 模型 · 置信度 87%",
      actions: [
        { label: "查看发电预测", value: "go-p2" },
        { label: "进入交易模拟", value: "go-p4" },
        { label: "生成备选方案", value: "re-simulate" },
      ],
    },
  },
  {
    key: "储能",
    keywords: ["储能", "充电", "放电", "SOC", "电池"],
    answer: {
      conclusion: "建议今日 12:00—14:00 电价低谷充电，17:50 后开始放电",
      confidence: 92,
      reasons: [
        "午间光伏出力高且电价处于低谷，充电成本低",
        "18:00 进入晚峰，电价预计上涨，放电收益高",
        "当前 SOC 64%，满足调度约束（20%–90%）",
        "循环次数逼近上限，建议每日 ≤1 次",
      ],
      impact: "预计储能套利收益 +520 元，弃电率降低 2.1%",
      model: { name: "StorageOptimize", version: "1.3" },
      dataSources: [
        { source: "BMS 采集", time: "15:40" },
        { source: "电价预测", time: "15:35" },
      ],
      riskNote: "基于 StorageOptimize 1.3 模型 · 置信度 92%",
      actions: [
        { label: "查看储能方案", value: "go-p3" },
        { label: "重新计算", value: "re-simulate" },
      ],
    },
  },
  {
    key: "预测",
    keywords: ["预测", "发电", "风速", "出力", "明天"],
    answer: {
      conclusion: "明日预计发电 142.3MWh（风电 91.7 + 光伏 50.6），置信度 91%",
      confidence: 91,
      reasons: [
        "14:00—17:00 风速骤降，预测不确定性升高（黄色预警）",
        "影响因子：风速 42%、风向 16%、设备可用率 15%",
        "最大预计偏差 ±8.4%",
      ],
      impact: "建议提前安排储能调度，减少现货偏差风险",
      model: { name: "WindForecast", version: "1.4" },
      dataSources: [
        { source: "气象 API", time: "15:30" },
        { source: "历史 SCADA", time: "15:40" },
        { source: "设备状态", time: "15:40" },
      ],
      riskNote: "基于 WindForecast 1.4 模型 · 置信度 91%",
      actions: [
        { label: "查看发电预测", value: "go-p2" },
        { label: "重新计算储能方案", value: "go-p3" },
      ],
    },
  },
  {
    key: "收益",
    keywords: ["收益", "赚钱", "收入", "经营", "效果", "偏差成本"],
    answer: {
      conclusion: "本月预计经营收益 486 万元，AI 优化方案较基准提升约 7.2%",
      confidence: 84,
      reasons: [
        "市场收入 486 万、储能收益 52 万、偏差成本 61 万",
        "AI 方案近 7 天收益均高于基准方案",
        "偏差成本同比下降 12%",
      ],
      impact: "累计减少偏差成本约 4.3 万元",
      model: { name: "Settle", version: "1.3" },
      dataSources: [
        { source: "交易结算", time: "15:40" },
        { source: "发电计量", time: "15:40" },
      ],
      riskNote: "基于 Settle 1.3 模型 · 置信度 84%",
      actions: [
        { label: "查看经营成效", value: "go-p6" },
      ],
    },
  },
];

// 兜底回答（无关键词命中）
const FALLBACK = {
  conclusion: "我可以帮您分析现货交易、储能调度、政策规则、发电预测与经营收益",
  confidence: 80,
  reasons: [
    "您可以尝试问：『明天为什么建议降低现货比例？』",
    "或：『如果下午风速下降 20%，收益会怎样？』",
    "或：『吉林现在有哪些储能相关交易规则？』",
  ],
  impact: "选择具体问题后，我会给出带数据依据的回答",
  model: { name: "北域AI Copilot", version: "1.0" },
  dataSources: [
    { source: "预置问答库", time: "—" },
  ],
  riskNote: "基于北域 AI Copilot 1.0 模型 · 置信度 80%",
  actions: [],
};

// 关键词匹配 → 返回结构化回答（八要素）
export function askAI(question) {
  if (!question) return FALLBACK;
  const q = String(question).toLowerCase();
  for (const rule of QA_RULES) {
    if (rule.keywords.some((kw) => q.includes(kw))) {
      return rule.answer;
    }
  }
  return FALLBACK;
}

// 常用问题建议（copilot 面板展示）
export const SUGGESTIONS = [
  "明天为什么建议降低现货比例？",
  "今天储能建议什么时候充电？",
  "吉林有哪些现货交易规则？",
  "本月经营收益怎么样？",
];
