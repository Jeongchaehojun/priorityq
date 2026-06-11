/* =========================================================================
   점수 공식 — 우선순위 점수를 산출하는 순수 함수들
   ---------------------------------------------------------------------------
   score = 중요도(importance) × 긴급도(urgency) + 가중치(aiBonus)

   · 중요도: 1~4 (사용자/분석기가 지정)
   · 긴급도: 마감일까지 남은 일수로 환산한 1~5
   · 가중치: 외부/핵심 관계자·협업 키워드 보너스 0~2

   이론상 최대 점수 = 4 × 5 + 2 = 22
   ========================================================================= */

import type { Importance, Task } from '../types';

export const MAX_POSSIBLE_SCORE = 22;

const MS_PER_DAY = 86_400_000;

/** 오늘 00:00 기준으로 due 까지 남은 일수 (음수면 기한초과) */
export function daysUntil(due: string | null, now: Date = new Date()): number | null {
  if (!due) return null;
  const t0 = new Date(now);
  t0.setHours(0, 0, 0, 0);
  const t1 = new Date(due);
  t1.setHours(0, 0, 0, 0);
  return Math.ceil((t1.getTime() - t0.getTime()) / MS_PER_DAY);
}

/** 마감일 → 긴급도(1~5). 마감 없으면 1 */
export function urgencyFromDue(due: string | null, now: Date = new Date()): number {
  const d = daysUntil(due, now);
  if (d === null) return 1;
  if (d <= 0) return 5; // 오늘/기한초과
  if (d === 1) return 4; // 내일
  if (d <= 3) return 3; // 3일 이내
  if (d <= 7) return 2; // 일주일 이내
  return 1; // 그 이상
}

/** 오늘로부터 n일 뒤 → input[type=date] 값(YYYY-MM-DD, 로컬 기준) */
export function dateInputFromOffset(days: number, now: Date = new Date()): string {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/** D-day 라벨 (없으면 null) */
export function dueLabel(due: string | null, now: Date = new Date()): string | null {
  const d = daysUntil(due, now);
  if (d === null) return null;
  if (d < 0) return '기한초과';
  if (d === 0) return 'D-DAY';
  return 'D-' + d;
}

/** 핵심 점수 공식 */
export function scoreOf(t: Pick<Task, 'importance' | 'dueDate' | 'aiBonus'>, now: Date = new Date()): number {
  return t.importance * urgencyFromDue(t.dueDate, now) + t.aiBonus;
}

/** 중요도 → 라벨/색 메타 */
export const IMPORTANCE_META: Record<Importance, { label: string; color: string; bg: string }> = {
  4: { label: '긴급', color: 'var(--p4)', bg: 'var(--p4-bg)' },
  3: { label: '높음', color: 'var(--p3)', bg: 'var(--p3-bg)' },
  2: { label: '보통', color: 'var(--p2)', bg: 'var(--p2-bg)' },
  1: { label: '낮음', color: 'var(--p1)', bg: 'var(--p1-bg)' },
};

/** 카드에 표시할 "왜 이 순위인가" 설명 문장 생성 */
export function buildWhy(t: Task, rank: number, now: Date = new Date()): string {
  const u = urgencyFromDue(t.dueDate, now);
  const parts: string[] = [];
  if (t.dueDate) parts.push(`마감 ${dueLabel(t.dueDate, now)}(긴급도 ${u})`);
  parts.push(`중요도 '${IMPORTANCE_META[t.importance].label}'`);
  if (t.aiBonus > 0) parts.push(`가중치 +${t.aiBonus}`);
  const tail = rank === 0 ? ' → 현재 1순위' : '';
  return parts.join(' · ') + ` = ${scoreOf(t, now)}점` + tail;
}
