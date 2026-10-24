import { prisma } from "@/lib/prisma";

const DASHSCOPE_URL =
  "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation";
const REPORT_MODEL = "qwen3.6-plus";
const REPORT_PERIOD_DAYS = 7;
const MAX_SOURCE_TURNS = 300;
const MAX_USER_TURNS = 80;
const MAX_TURN_CHARS = 500;

export const WELLBEING_REPORT_DISCLAIMER =
  "本报告由 AI 基于近期陪伴对话生成，不是心理诊断，不能替代专业评估。如出现自伤、他伤或紧急危险，请立即联系 120/110 或 12356。";

export type WellbeingMoodTrend =
  | "IMPROVING"
  | "STABLE"
  | "FLUCTUATING"
  | "NEEDS_ATTENTION"
  | "INSUFFICIENT_DATA";

export type WellbeingRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";

export type WellbeingTheme = {
  label: string;
  summary: string;
};

export type WellbeingReportContent = {
  overview: string;
  moodTrend: WellbeingMoodTrend;
  moodSummary: string;
  themes: WellbeingTheme[];
  strengths: string[];
  suggestions: string[];
  riskLevel: WellbeingRiskLevel;
  riskNotes: string[];
  limitedData: boolean;
  disclaimer: string;
};

type RawReport = Record<string, unknown>;

export class WellbeingReportError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "WellbeingReportError";
    this.status = status;
  }
}

export async function getLatestWellbeingReport(elderDeviceId: string) {
  return prisma.wellbeingReport.findFirst({
    where: { elderDeviceId },
    orderBy: { createdAt: "desc" },
  });
}

export function parseWellbeingReportContent(
  contentJson: string | null | undefined,
): WellbeingReportContent | null {
  if (!contentJson) {
    return null;
  }

  try {
    const parsed = JSON.parse(contentJson) as RawReport;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    return normalizeContent(
      parsed,
      parsed.limitedData === true || parsed.moodTrend === "INSUFFICIENT_DATA",
    );
  } catch {
    return null;
  }
}

export async function generateWellbeingReport(input: {
  elderDeviceId: string;
  familyCircleId: string;
  generatedById?: string | null;
}) {
  const apiKey = process.env.DASHSCOPE_API_KEY?.trim();
  if (!apiKey) {
    throw new WellbeingReportError(
      "AI 报告服务尚未配置，请联系管理员。",
      503,
    );
  }

  const periodEnd = new Date();
  const periodStart = new Date(
    periodEnd.getTime() - REPORT_PERIOD_DAYS * 24 * 60 * 60 * 1000,
  );

  const turns = await prisma.conversationTurn.findMany({
    where: {
      elderDeviceId: input.elderDeviceId,
      createdAt: { gte: periodStart, lte: periodEnd },
    },
    orderBy: { createdAt: "desc" },
    take: MAX_SOURCE_TURNS,
    select: {
      role: true,
      content: true,
      createdAt: true,
    },
  });

  const userTurns = turns
    .filter((turn) => turn.role === "USER" && turn.content.trim().length > 0)
    .reverse();
  if (userTurns.length === 0) {
    throw new WellbeingReportError(
      "最近 7 天还没有可用于生成报告的用户对话，请先和数字人聊几次。",
      422,
    );
  }

  const limitedData = userTurns.length < 5;
  const selectedTurns = userTurns.slice(-MAX_USER_TURNS);
  const transcript = selectedTurns
    .map((turn) => `- ${turn.content.trim().slice(0, MAX_TURN_CHARS)}`)
    .join("\n");

  const rawReport = await requestReport({
    apiKey,
    transcript,
    userTurnCount: selectedTurns.length,
    limitedData,
    periodStart,
    periodEnd,
  });
  const content = normalizeContent(rawReport, limitedData);

  return prisma.wellbeingReport.create({
    data: {
      elderDeviceId: input.elderDeviceId,
      familyCircleId: input.familyCircleId,
      generatedById: input.generatedById ?? null,
      periodStart,
      periodEnd,
      contentJson: JSON.stringify(content),
      riskLevel: content.riskLevel,
      sourceTurnCount: turns.length,
      userTurnCount: userTurns.length,
      model: REPORT_MODEL,
    },
  });
}

async function requestReport(input: {
  apiKey: string;
  transcript: string;
  userTurnCount: number;
  limitedData: boolean;
  periodStart: Date;
  periodEnd: Date;
}): Promise<RawReport> {
  let response: Response;

  try {
    response = await fetch(DASHSCOPE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: REPORT_MODEL,
        input: {
          messages: [
            {
              role: "system",
              content: buildSystemPrompt(),
            },
            {
              role: "user",
              content: buildUserPrompt(input),
            },
          ],
        },
        parameters: {
          result_format: "message",
          enable_thinking: false,
          temperature: 0.3,
          max_tokens: 1200,
        },
      }),
      signal: AbortSignal.timeout(90_000),
    });
  } catch (error) {
    console.error("Wellbeing report AI request failed", error);
    throw new WellbeingReportError(
      "AI 报告生成超时，请稍后再试。",
      504,
    );
  }

  if (!response.ok) {
    console.error("Wellbeing report AI error", response.status);
    throw new WellbeingReportError(
      "AI 报告生成失败，请稍后再试。",
      502,
    );
  }

  const data = (await response.json().catch(() => null)) as
    | Record<string, unknown>
    | null;
  const text = extractReportText(data);
  if (!text) {
    throw new WellbeingReportError("AI 没有返回报告内容，请稍后再试。", 502);
  }

  try {
    const parsed = JSON.parse(stripCodeFence(text)) as RawReport;
    if (!parsed || typeof parsed !== "object") {
      throw new Error("报告不是对象");
    }
    return parsed;
  } catch (error) {
    console.error("Wellbeing report JSON parse failed", error);
    throw new WellbeingReportError(
      "AI 返回的报告格式异常，请稍后再试。",
      502,
    );
  }
}

function buildSystemPrompt() {
  return [
    "你是“安智伴”的 AI 陪伴观察助手，负责根据用户与数字人的近期对话，生成一份非诊断性的陪伴观察周报。",
    "",
    "必须遵守的边界：",
    "1. 只做陪伴观察和心理健康教育，不做心理诊断，不判断用户患有抑郁症、焦虑症或其他精神障碍。",
    "2. 不提供药物、剂量、停药或替代专业治疗的建议。",
    "3. 只依据提供的用户发言，不编造事实，不引用姓名、电话、地址等隐私信息。",
    "4. 如果对话样本很少，要明确标注 limitedData=true，不要做过度推断；不要用一句对话下结论。",
    "5. 出现自伤、他伤、虐待、霸凌或急性危险线索时，riskLevel 至少为 HIGH，并建议联系监护人、家人、老师或专业人员；紧急情况提示 120/110/12356。",
    "6. 语气客观、温和、可执行，不使用恐吓式表达，不制造依赖。",
    "",
    "只输出一个严格合法的 JSON 对象，不要 Markdown 代码块，不要额外解释。字段如下：",
    "{",
    '  "overview": "80-120字的本周陪伴概况，说明这是非诊断性观察",',
    '  "moodTrend": "IMPROVING | STABLE | FLUCTUATING | NEEDS_ATTENTION | INSUFFICIENT_DATA",',
    '  "moodSummary": "50-80字的情绪变化说明，避免诊断词",',
    '  "themes": [{"label": "主题名", "summary": "40字以内说明"}],',
    '  "strengths": ["用户展现的积极资源，2-4条"],',
    '  "suggestions": ["具体、温和、可执行的建议，2-4条"],',
    '  "riskLevel": "LOW | MEDIUM | HIGH | UNKNOWN",',
    '  "riskNotes": ["需要家属关注的具体观察，没有则为空数组"],',
    '  "limitedData": false',
    "}",
    "themes 最多 4 条；strengths 和 suggestions 各最多 4 条；riskNotes 最多 3 条。",
  ].join("\n");
}

function buildUserPrompt(input: {
  transcript: string;
  userTurnCount: number;
  limitedData: boolean;
  periodStart: Date;
  periodEnd: Date;
}) {
  const periodLabel = `${formatDate(input.periodStart)} 至 ${formatDate(input.periodEnd)}`;
  return [
    `分析周期：${periodLabel}`,
    `用户发言数量：${input.userTurnCount}`,
    `是否样本有限：${input.limitedData ? "是，请明确说明，不要过度推断" : "否"}`,
    "",
    "以下是用户在这段时间内的发言（已去除数字人回复）：",
    input.transcript,
    "",
    "请生成 JSON 报告。不要把数字人的话当成用户的感受；不要根据单条发言推断长期状态。",
  ].join("\n");
}

function extractReportText(data: Record<string, unknown> | null) {
  const output = data?.output;
  if (!output || typeof output !== "object") {
    return "";
  }
  const choices = (output as Record<string, unknown>).choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    return "";
  }
  const first = choices[0];
  if (!first || typeof first !== "object") {
    return "";
  }
  const message = (first as Record<string, unknown>).message;
  if (!message || typeof message !== "object") {
    return "";
  }
  const content = (message as Record<string, unknown>).content;
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }
        if (part && typeof part === "object" && "text" in part) {
          return String((part as Record<string, unknown>).text || "");
        }
        return "";
      })
      .join("");
  }
  return "";
}

function stripCodeFence(text: string) {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function normalizeContent(
  value: RawReport,
  fallbackLimitedData: boolean,
): WellbeingReportContent {
  const themes = normalizeThemes(value.themes);
  const moodTrend = normalizeMoodTrend(value.moodTrend, fallbackLimitedData);
  const riskLevel = normalizeRiskLevel(value.riskLevel);
  const limitedData =
    value.limitedData === true ||
    fallbackLimitedData ||
    moodTrend === "INSUFFICIENT_DATA";

  return {
    overview:
      text(value.overview, 900) ||
      (limitedData
        ? "本周可用于分析的对话较少，暂时只能做初步观察，建议继续陪伴后再生成报告。"
        : "本周已完成一次陪伴观察，以下内容仅用于了解近期交流主题，不作为心理诊断。"),
    moodTrend,
    moodSummary:
      text(value.moodSummary, 500) ||
      (limitedData
        ? "样本不足，暂不对情绪变化做趋势判断。"
        : "本次报告未发现明确的情绪趋势结论，建议结合实际交流继续观察。"),
    themes,
    strengths: textList(value.strengths),
    suggestions: textList(value.suggestions),
    riskLevel,
    riskNotes: textList(value.riskNotes),
    limitedData,
    disclaimer: WELLBEING_REPORT_DISCLAIMER,
  };
}

function normalizeThemes(value: unknown): WellbeingTheme[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === "string") {
        return { label: item.trim().slice(0, 30), summary: "" };
      }
      if (!item || typeof item !== "object") {
        return null;
      }
      const record = item as Record<string, unknown>;
      const label = text(record.label, 30);
      if (!label) {
        return null;
      }
      return { label, summary: text(record.summary, 300) };
    })
    .filter((item): item is WellbeingTheme => item !== null)
    .slice(0, 4);
}

function normalizeMoodTrend(
  value: unknown,
  limitedData: boolean,
): WellbeingMoodTrend {
  const allowed: WellbeingMoodTrend[] = [
    "IMPROVING",
    "STABLE",
    "FLUCTUATING",
    "NEEDS_ATTENTION",
    "INSUFFICIENT_DATA",
  ];
  if (typeof value === "string" && allowed.includes(value as WellbeingMoodTrend)) {
    return value as WellbeingMoodTrend;
  }
  return limitedData ? "INSUFFICIENT_DATA" : "STABLE";
}

function normalizeRiskLevel(value: unknown): WellbeingRiskLevel {
  const allowed: WellbeingRiskLevel[] = ["LOW", "MEDIUM", "HIGH", "UNKNOWN"];
  if (typeof value === "string" && allowed.includes(value as WellbeingRiskLevel)) {
    return value as WellbeingRiskLevel;
  }
  return "UNKNOWN";
}

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function textList(value: unknown, maxItems = 4) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => text(item, 220))
    .filter(Boolean)
    .slice(0, maxItems);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "numeric",
    day: "numeric",
  }).format(date);
}
