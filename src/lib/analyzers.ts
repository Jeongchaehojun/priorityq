/* =========================================================================
   STRATEGY 패턴 #1 — 분석기(Analyzer)
   ---------------------------------------------------------------------------
   동일한 analyze(title) 규약(Analyzer 인터페이스)을 두고, 구현 전략을
   자유롭게 교체할 수 있도록 설계했다.

   · RuleBasedAnalyzer : 외부 의존성 0의 키워드 규칙 (오프라인, 즉시)
   · ClaudeAnalyzer    : Claude(LLM)로 문맥을 추론 (네트워크 필요)

   runAnalyzer(title) 가 AnalyzerContext 역할을 한다 — AI를 먼저 시도하고
   실패·타임아웃이면 규칙기반으로 graceful fallback 한다. 사용자에게는 오류를
   노출하지 않고 항상 결과가 나온다. (발표자료의 alt 프래그먼트와 동일한 흐름)
   ========================================================================= */

import Anthropic from '@anthropic-ai/sdk';
import type { Analysis, EnergyLevel, Importance } from '../types';

/** 동기 분석 전략 규약 (규칙기반) */
export interface Analyzer {
  readonly name: string;
  analyze(title: string): Analysis;
}

/** 비동기 분석 전략 규약 (LLM 호출 등) */
export interface AsyncAnalyzer {
  readonly name: string;
  analyze(title: string): Promise<Analysis>;
}

/** 키워드 사전 — 규칙기반 추론의 근거 */
export const KEYWORDS = {
  urgent: ['긴급', '당장', '오늘', '내일', '마감', '최종', '즉시', 'asap', '데드라인', '제출', '마감일', '오류', '버그', '장애', '다운', '롤백'],
  high: ['이번주', '회의', '미팅', '발표', '기획', '검토', '피드백', '요청', '보고', '보고서', '준비', '리뷰', '면접', '시험', '과제'],
  low: ['독서', '스크랩', '정리', '메모', '아이디어', '생각', '운동', '청소', '쇼핑', '산책', '구경', '나중에', '언젠가'],
  bonus2: ['임원', '경영진', '대표', '교수', '고객', '클라이언트', '외부', '계약', '결제', '심사', '발표', '제출', '면접'],
  bonus1: ['팀', '협업', '동료', '슬랙', '회의록', '리뷰', '공유', '지원', '함께', '조원', '과제'],
  highEnergy: ['기획', '설계', '개발', '분석', '작성', '발표', '문제', '버그', '복잡', '어려', '집중', '코딩', '구현', '디버깅'],
} as const;

const firstHit = (text: string, words: readonly string[]): string | undefined =>
  words.find((w) => text.includes(w.toLowerCase()));

/** 제목의 시점 표현을 "오늘로부터 며칠 뒤 마감"으로 환산. 없으면 null.
 *  이번주/다음주는 현재 요일을 기준으로 다가오는 일요일(주말)까지로 계산한다. */
export function inferDueInDays(title: string, now: Date = new Date()): number | null {
  const t = title;
  const daysToSunday = (7 - now.getDay()) % 7; // 오늘이 일요일이면 0

  const isNextWeek = t.includes('다음주') || t.includes('다음 주') || t.includes('담주') || t.includes('차주');
  const today0 = new Date(now);
  today0.setHours(0, 0, 0, 0);
  const daysTo = (target: Date): number => {
    const b = new Date(target);
    b.setHours(0, 0, 0, 0);
    return Math.max(0, Math.round((b.getTime() - today0.getTime()) / 86_400_000));
  };

  // 구체적 날짜 "N월 D일" (지난 날짜면 내년으로)
  const md = t.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if (md) {
    const mo = parseInt(md[1], 10) - 1;
    const day = parseInt(md[2], 10);
    let target = new Date(now.getFullYear(), mo, day);
    if (daysTo(target) === 0 && target.getTime() < today0.getTime()) target = new Date(now.getFullYear() + 1, mo, day);
    return daysTo(target);
  }
  // "N일 뒤/후/이내" · "N주 뒤/후" · "N달/개월 뒤/후"
  const mDay = t.match(/(\d+)\s*일\s*(뒤|후|안|이내|내)/);
  if (mDay) return Math.max(0, parseInt(mDay[1], 10));
  const mWeek = t.match(/(\d+)\s*주\s*(뒤|후)/);
  if (mWeek) return Math.max(0, parseInt(mWeek[1], 10) * 7);
  const mMon = t.match(/(\d+)\s*(달|개월)\s*(뒤|후)/);
  if (mMon) return daysTo(new Date(now.getFullYear(), now.getMonth() + parseInt(mMon[1], 10), now.getDate()));

  // 월 단위 표현
  if (/다음\s*달\s*말|담달\s*말/.test(t)) return daysTo(new Date(now.getFullYear(), now.getMonth() + 2, 0));
  if (/이번\s*달\s*말|이달\s*말|월말/.test(t)) return daysTo(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  if (t.includes('다음달') || t.includes('다음 달') || t.includes('담달'))
    return daysTo(new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()));
  if (t.includes('이번달') || t.includes('이번 달') || t.includes('이달'))
    return daysTo(new Date(now.getFullYear(), now.getMonth() + 1, 0));

  // 특정 요일 ("(다음주) 수요일") — '다음주'면 다음 달력주의 해당 요일
  const WD: Record<string, number> = { 일: 0, 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6 };
  const wd = t.match(/([일월화수목금토])\s*요일/);
  if (wd) {
    const target = WD[wd[1]];
    if (isNextWeek) {
      const daysToNextMon = (1 - now.getDay() + 7) % 7 || 7; // 다음 주 월요일까지
      const offsetFromMon = (target + 6) % 7; // 월=0 … 일=6
      return daysToNextMon + offsetFromMon;
    }
    const d = (target - now.getDay() + 7) % 7;
    return d === 0 ? 7 : d; // 같은 요일이면 다음 그 요일
  }

  if (t.includes('글피')) return 3;
  if (t.includes('내일모레') || t.includes('모레')) return 2;
  if (t.includes('내일')) return 1;
  if (t.includes('오늘') || t.includes('당장') || t.includes('지금')) return 0;
  if (t.includes('다음주') || t.includes('다음 주') || t.includes('담주') || t.includes('차주') || t.includes('낼주'))
    return daysToSunday + 7;
  if (t.includes('이번주') || t.includes('이번 주') || t.includes('금주') || t.includes('주말') || t.includes('주중'))
    return daysToSunday;
  return null;
}

/** dueInDays → 사람이 읽는 라벨 */
const dueHint = (days: number): string => (days <= 0 ? '오늘(D-DAY)' : `D-${days}`);

/** 규칙기반 전략: 키워드 매칭으로 즉시 추론. 인터넷·API 키 불필요. */
export const RuleBasedAnalyzer: Analyzer = {
  name: '규칙기반',
  analyze(title: string): Analysis {
    const t = title.toLowerCase();
    const why: string[] = [];

    let importance: Importance = 2;
    const u = firstHit(t, KEYWORDS.urgent);
    const h = firstHit(t, KEYWORDS.high);
    const l = firstHit(t, KEYWORDS.low);
    if (u) {
      importance = 4;
      why.push(`'${u}' → 긴급 신호`);
    } else if (h) {
      importance = 3;
      why.push(`'${h}' → 우선 처리 대상`);
    } else if (l) {
      importance = 1;
      why.push(`'${l}' → 여유 업무`);
    }

    let aiBonus = 0;
    const b2 = firstHit(t, KEYWORDS.bonus2);
    const b1 = firstHit(t, KEYWORDS.bonus1);
    if (b2) {
      aiBonus = 2;
      why.push(`외부·핵심 관계자('${b2}') +2`);
    } else if (b1) {
      aiBonus = 1;
      why.push(`팀 협업('${b1}') +1`);
    }

    const energyLevel: EnergyLevel = firstHit(t, KEYWORDS.highEnergy) ? 'high' : 'low';

    const dueInDays = inferDueInDays(title);
    if (dueInDays !== null) why.push(`마감 추정 ${dueHint(dueInDays)}`);

    if (why.length === 0) why.push('특이 키워드 없음 → 보통(2)으로 추정');

    return { importance, aiBonus, energyLevel, reason: why.join(' · '), source: '규칙기반', dueInDays };
  },
};

/** 수동 입력: 분석 없이 기본값. 사용자가 직접 중요도를 지정. */
export function manualAnalysis(): Analysis {
  return {
    importance: 2,
    aiBonus: 0,
    energyLevel: 'low',
    reason: '수동 입력 — 중요도를 직접 지정하세요',
    source: '수동',
  };
}

/* -------------------------------------------------------------------------
   STRATEGY B — ClaudeAnalyzer (LLM 문맥 추론)
   ------------------------------------------------------------------------- */

/** 기본 모델 / 타임아웃 — 한 곳에서 조정 가능 */
const CLAUDE_MODEL = 'claude-opus-4-8';
const GEMINI_MODEL = 'gemini-2.5-flash';
const AI_TIMEOUT_MS = 12_000; // 발표자료의 "3초" 는 목표치 — 모델 지연을 감안한 실제 상한
const KEY_STORAGE = 'pq_ai_key';

/** API 키 조회: env(VITE_GEMINI_API_KEY / VITE_ANTHROPIC_API_KEY) → 브라우저 localStorage 순 */
export function getApiKey(): string {
  const env = (import.meta as unknown as { env?: Record<string, string> }).env;
  const fromEnv = env?.VITE_GEMINI_API_KEY ?? env?.VITE_ANTHROPIC_API_KEY;
  if (fromEnv) return fromEnv;
  try {
    return localStorage.getItem(KEY_STORAGE) ?? '';
  } catch {
    return '';
  }
}

/** API 키 저장/삭제 (이 브라우저에만 보관). 빈 값이면 규칙기반만 사용 */
export function setApiKey(key: string): void {
  try {
    if (key) localStorage.setItem(KEY_STORAGE, key);
    else localStorage.removeItem(KEY_STORAGE);
  } catch {
    /* localStorage 접근 불가 — 무시 */
  }
}

export function hasApiKey(): boolean {
  return getApiKey().trim().length > 0;
}

/** 키 형식으로 AI 제공자 판별 — sk-ant…→Claude, 그 외(AIza…)→Gemini */
export function aiProvider(): 'claude' | 'gemini' | null {
  const k = getApiKey().trim();
  if (!k) return null;
  return k.startsWith('sk-ant') ? 'claude' : 'gemini';
}

/** UI 표시용 제공자 이름 */
export function aiLabel(): string {
  const p = aiProvider();
  return p === 'claude' ? 'Claude' : p === 'gemini' ? 'Gemini' : 'AI';
}

const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, Math.round(n)));

/** 분석 결과를 강제할 구조화 출력 스키마 (긴급도는 마감일로 따로 계산하므로 제외) */
const ANALYSIS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    importance: { type: 'integer', enum: [1, 2, 3, 4], description: '중요도 4=긴급 3=높음 2=보통 1=낮음' },
    aiBonus: { type: 'integer', enum: [0, 1, 2], description: '관계자 가중치 2=핵심관계자(교수/고객/외부) 1=팀협업 0=개인' },
    energyLevel: { type: 'string', enum: ['low', 'high'], description: 'high=깊은 집중 필요, low=가볍게 처리 가능' },
    reason: { type: 'string', description: '왜 그렇게 판단했는지 한국어 한 문장' },
  },
  required: ['importance', 'aiBonus', 'energyLevel', 'reason'],
} as const;

const SYSTEM_PROMPT = `너는 개인 업무 우선순위 큐의 분석기다. 사용자가 입력한 '할 일' 제목 한 줄을 읽고, 그 일의 성격을 보고 중요도·가중치·에너지를 판단한다. (마감일/긴급도는 시스템이 따로 계산하니 너는 판단하지 않는다.)

- importance(중요도, 1~4): 일의 본질적 중요도. 4=긴급·장애·시험·중요 제출, 3=과제·발표·회의·보고서 등 해야만 하는 일, 2=약속·미팅·심부름 등 보통, 1=식사·휴식·운동·독서·산책·정리 등 일상/여가.
- aiBonus(가중치, 0~2): 2=교수·고객·임원·외부 등 핵심 관계자가 얽히거나 공식 제출/계약, 1=팀·협업·공유 등 타인과 함께, 0=온전히 개인 일(식사·운동·독서 등).
- energyLevel: high=설계·개발·작성·디버깅·공부 등 깊은 집중 필요, low=가볍게 처리 가능(식사·정리·연락 등).
- reason: 위 판단의 근거를 한국어 한 문장으로 간결하게.

반드시 스키마에 맞는 JSON만 출력한다.`;

/** Claude(LLM) 전략 — 네트워크 호출. 키 없거나 실패 시 throw (상위에서 폴백) */
export const ClaudeAnalyzer: AsyncAnalyzer = {
  name: 'Claude',
  async analyze(title: string): Promise<Analysis> {
    const apiKey = getApiKey().trim();
    if (!apiKey) throw new Error('API 키 없음');

    const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
    const message = await client.messages.create(
      {
        model: CLAUDE_MODEL,
        max_tokens: 400,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: `할 일: "${title}"` }],
        output_config: { format: { type: 'json_schema', schema: ANALYSIS_SCHEMA } },
      },
      { timeout: AI_TIMEOUT_MS },
    );

    const block = message.content.find((b) => b.type === 'text');
    if (!block || block.type !== 'text') throw new Error('AI 응답에 텍스트 없음');
    const raw = JSON.parse(block.text) as Partial<Analysis>;

    return {
      importance: clamp(Number(raw.importance ?? 2), 1, 4) as Importance,
      aiBonus: clamp(Number(raw.aiBonus ?? 0), 0, 2),
      energyLevel: raw.energyLevel === 'high' ? 'high' : 'low',
      reason: (raw.reason ?? 'AI 추론').trim(),
      source: 'AI',
    };
  },
};

/* -------------------------------------------------------------------------
   STRATEGY B' — GeminiAnalyzer (Google Gemini, REST fetch)
   ------------------------------------------------------------------------- */

const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/** Gemini 구조화 출력 스키마 (정수 범위는 클라이언트에서 clamp) */
const GEMINI_SCHEMA = {
  type: 'OBJECT',
  properties: {
    importance: { type: 'INTEGER' },
    aiBonus: { type: 'INTEGER' },
    energyLevel: { type: 'STRING', enum: ['low', 'high'] },
    reason: { type: 'STRING' },
  },
  required: ['importance', 'aiBonus', 'energyLevel', 'reason'],
  propertyOrdering: ['importance', 'aiBonus', 'energyLevel', 'reason'],
} as const;

/** Gemini(LLM) 전략 — REST 호출. 키 없거나 실패 시 throw (상위에서 폴백) */
export const GeminiAnalyzer: AsyncAnalyzer = {
  name: 'Gemini',
  async analyze(title: string): Promise<Analysis> {
    const apiKey = getApiKey().trim();
    if (!apiKey) throw new Error('API 키 없음');

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), AI_TIMEOUT_MS);
    try {
      const res = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        signal: ctrl.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: 'user', parts: [{ text: `할 일: "${title}"` }] }],
          generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: GEMINI_SCHEMA },
        }),
      });
      if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
      const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Gemini 응답이 비어 있음');
      const raw = JSON.parse(text) as Partial<Analysis>;

      return {
        importance: clamp(Number(raw.importance ?? 2), 1, 4) as Importance,
        aiBonus: clamp(Number(raw.aiBonus ?? 0), 0, 2),
        energyLevel: raw.energyLevel === 'high' ? 'high' : 'low',
        reason: (raw.reason ?? 'AI 추론').trim(),
        source: 'AI',
      };
    } finally {
      clearTimeout(timer);
    }
  },
};

/**
 * AnalyzerContext — 전략 오케스트레이션.
 * · 중요도·가중치·에너지·근거 → AI(있으면) / 규칙기반(없거나 실패 시)
 * · 마감일(dueInDays) → 언제나 규칙기반 파서가 결정 (LLM 날짜 계산은 불안정해서 분리)
 */
export async function runAnalyzer(title: string): Promise<Analysis> {
  const dueInDays = inferDueInDays(title); // 날짜는 항상 규칙기반 (결정적)
  const provider = aiProvider();
  if (!provider) return RuleBasedAnalyzer.analyze(title); // 규칙기반엔 이미 dueInDays 포함
  const analyzer: AsyncAnalyzer = provider === 'claude' ? ClaudeAnalyzer : GeminiAnalyzer;
  try {
    const ai = await analyzer.analyze(title);
    return { ...ai, dueInDays }; // AI 판단 + 규칙기반 마감일
  } catch {
    const fallback = RuleBasedAnalyzer.analyze(title);
    return { ...fallback, reason: `${fallback.reason} · (AI 분석 실패 → 규칙기반 폴백)` };
  }
}
