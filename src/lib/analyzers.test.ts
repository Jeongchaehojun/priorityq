import { describe, it, expect } from 'vitest';
import { RuleBasedAnalyzer, manualAnalysis, inferDueInDays } from './analyzers';

describe('inferDueInDays — 시점 표현 → 마감까지 일수', () => {
  const now = new Date(2026, 5, 11); // 2026-06-11 (목)
  it('내일 → 1 (조사가 붙어도)', () => {
    expect(inferDueInDays('내일까지 과제', now)).toBe(1);
    expect(inferDueInDays('내일 과제', now)).toBe(1);
  });
  it('오늘 → 0, 모레 → 2', () => {
    expect(inferDueInDays('오늘 마감', now)).toBe(0);
    expect(inferDueInDays('모레 발표', now)).toBe(2);
  });
  it('다음달 → 한 달 뒤(2026-07-11 = 30일)', () => {
    expect(inferDueInDays('다음달 보고서', now)).toBe(30);
  });
  it('월말 → 이번 달 말(2026-06-30 = 19일)', () => {
    expect(inferDueInDays('월말까지 정산', now)).toBe(19);
  });
  it('구체적 날짜 "6월 20일" → 9일', () => {
    expect(inferDueInDays('6월 20일 발표자료 제출', now)).toBe(9);
  });
  it('다음주 수요일 → 다음 달력주 수요일(2026-06-17 = 6일)', () => {
    expect(inferDueInDays('다음주 수요일 과제', now)).toBe(6);
  });
  it('시점 표현이 없으면 null', () => {
    expect(inferDueInDays('알고리즘 과제', now)).toBeNull();
  });
});

describe('RuleBasedAnalyzer — 키워드 기반 추론', () => {
  it('긴급 키워드는 중요도 4', () => {
    expect(RuleBasedAnalyzer.analyze('내일까지 보고서 제출 마감').importance).toBe(4);
  });
  it('우선 처리 키워드는 중요도 3', () => {
    expect(RuleBasedAnalyzer.analyze('팀 회의 준비').importance).toBe(3);
  });
  it('여유 키워드는 중요도 1', () => {
    expect(RuleBasedAnalyzer.analyze('읽을 거 스크랩 정리').importance).toBe(1);
  });
  it('특이 키워드 없으면 보통(2)', () => {
    expect(RuleBasedAnalyzer.analyze('빨래방 들르기').importance).toBe(2);
  });

  it('외부·핵심 관계자는 가중치 +2', () => {
    expect(RuleBasedAnalyzer.analyze('교수님께 메일').aiBonus).toBe(2);
  });
  it('팀 협업은 가중치 +1', () => {
    const r = RuleBasedAnalyzer.analyze('동료와 코드 공유');
    expect(r.aiBonus).toBe(1);
  });

  it('집중 키워드는 energyLevel=high', () => {
    expect(RuleBasedAnalyzer.analyze('알고리즘 디버깅').energyLevel).toBe('high');
  });
  it('일반 업무는 energyLevel=low', () => {
    expect(RuleBasedAnalyzer.analyze('쇼핑하기').energyLevel).toBe('low');
  });

  it('항상 사람이 읽을 수 있는 reason 을 채운다', () => {
    expect(RuleBasedAnalyzer.analyze('아무 말').reason.length).toBeGreaterThan(0);
  });
  it('source 는 규칙기반', () => {
    expect(RuleBasedAnalyzer.analyze('x').source).toBe('규칙기반');
  });
});

describe('manualAnalysis', () => {
  it('기본 중요도 2, source 수동', () => {
    const m = manualAnalysis();
    expect(m.importance).toBe(2);
    expect(m.source).toBe('수동');
  });
});
