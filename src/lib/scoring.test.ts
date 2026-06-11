import { describe, it, expect } from 'vitest';
import { scoreOf, urgencyFromDue, daysUntil, dueLabel, MAX_POSSIBLE_SCORE } from './scoring';
import type { Task } from '../types';

// 테스트 기준일을 고정해 시간 의존성을 제거
const NOW = new Date('2026-06-08T09:00:00');
const dayISO = (days: number): string => {
  const d = new Date('2026-06-08T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString();
};

describe('daysUntil', () => {
  it('마감 없으면 null', () => {
    expect(daysUntil(null, NOW)).toBeNull();
  });
  it('오늘은 0, 내일은 1, 어제는 -1', () => {
    expect(daysUntil(dayISO(0), NOW)).toBe(0);
    expect(daysUntil(dayISO(1), NOW)).toBe(1);
    expect(daysUntil(dayISO(-1), NOW)).toBe(-1);
  });
});

describe('urgencyFromDue — 마감일 → 긴급도(1~5)', () => {
  it('마감 없음 → 1', () => expect(urgencyFromDue(null, NOW)).toBe(1));
  it('오늘/기한초과 → 5', () => {
    expect(urgencyFromDue(dayISO(0), NOW)).toBe(5);
    expect(urgencyFromDue(dayISO(-3), NOW)).toBe(5);
  });
  it('내일 → 4', () => expect(urgencyFromDue(dayISO(1), NOW)).toBe(4));
  it('3일 이내 → 3', () => expect(urgencyFromDue(dayISO(3), NOW)).toBe(3));
  it('일주일 이내 → 2', () => expect(urgencyFromDue(dayISO(7), NOW)).toBe(2));
  it('그 이상 → 1', () => expect(urgencyFromDue(dayISO(30), NOW)).toBe(1));
});

describe('dueLabel', () => {
  it('오늘은 D-DAY, 미래는 D-n, 과거는 기한초과', () => {
    expect(dueLabel(dayISO(0), NOW)).toBe('D-DAY');
    expect(dueLabel(dayISO(5), NOW)).toBe('D-5');
    expect(dueLabel(dayISO(-2), NOW)).toBe('기한초과');
    expect(dueLabel(null, NOW)).toBeNull();
  });
});

describe('scoreOf — 중요도 × 긴급도 + 가중치', () => {
  const make = (importance: Task['importance'], dueDate: string | null, aiBonus: number) =>
    ({ importance, dueDate, aiBonus }) as Pick<Task, 'importance' | 'dueDate' | 'aiBonus'>;

  it('마감 없는 보통 업무: 2 × 1 + 0 = 2', () => {
    expect(scoreOf(make(2, null, 0), NOW)).toBe(2);
  });
  it('내일 마감 긴급 + 가중치2: 4 × 4 + 2 = 18', () => {
    expect(scoreOf(make(4, dayISO(1), 2), NOW)).toBe(18);
  });
  it('이론상 최대(오늘 마감 긴급 +2): 4 × 5 + 2 = 22 = MAX', () => {
    expect(scoreOf(make(4, dayISO(0), 2), NOW)).toBe(22);
    expect(MAX_POSSIBLE_SCORE).toBe(22);
  });
});
