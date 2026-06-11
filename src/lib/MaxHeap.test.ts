import { describe, it, expect } from 'vitest';
import { MaxHeap, traceInsert, traceExtractMax, type Scored } from './MaxHeap';

const items = (...scores: number[]): Scored[] => scores.map((score) => ({ score }));

/** 배열이 최대-힙 속성(부모 ≥ 두 자식)을 만족하는지 검증 */
function isMaxHeap(a: Scored[]): boolean {
  for (let i = 0; i < a.length; i++) {
    const l = 2 * i + 1;
    const r = 2 * i + 2;
    if (l < a.length && a[i].score < a[l].score) return false;
    if (r < a.length && a[i].score < a[r].score) return false;
  }
  return true;
}

describe('MaxHeap — 기본 동작', () => {
  it('빈 힙은 peek/extractMax 가 null', () => {
    const h = new MaxHeap();
    expect(h.isEmpty()).toBe(true);
    expect(h.peek()).toBeNull();
    expect(h.extractMax()).toBeNull();
  });

  it('insert 후 루트는 항상 최댓값', () => {
    const h = new MaxHeap<Scored>();
    for (const it of items(3, 1, 4, 1, 5, 9, 2, 6)) h.insert(it);
    expect(h.peek()?.score).toBe(9);
    expect(h.size()).toBe(8);
  });

  it('insert 직후에도 힙 속성을 항상 유지', () => {
    const h = new MaxHeap<Scored>();
    for (const it of items(7, 2, 9, 1, 8, 3, 10, 4, 6, 5)) {
      h.insert(it);
      expect(isMaxHeap(h.a)).toBe(true);
    }
  });

  it('extractMax 는 내림차순으로 꺼내며 매 단계 힙 속성 유지', () => {
    const h = new MaxHeap<Scored>();
    for (const it of items(5, 3, 8, 1, 9, 2, 7)) h.insert(it);
    const out: number[] = [];
    while (!h.isEmpty()) {
      out.push(h.extractMax()!.score);
      expect(isMaxHeap(h.a)).toBe(true);
    }
    expect(out).toEqual([9, 8, 7, 5, 3, 2, 1]);
  });

  it('트리 높이 = ⌊log₂ n⌋', () => {
    const h = new MaxHeap<Scored>();
    expect(h.height()).toBe(0);
    for (const it of items(1, 2, 3, 4, 5, 6, 7)) h.insert(it);
    expect(h.height()).toBe(2); // n=7 → ⌊log₂7⌋ = 2
  });
});

describe('MaxHeap.heapsort', () => {
  it('완전 내림차순 정렬을 반환한다', () => {
    const { sorted } = MaxHeap.heapsort(items(4, 10, 3, 5, 1, 8, 7, 2, 9, 6));
    expect(sorted.map((x) => x.score)).toEqual([10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
  });

  it('동점수의 상대 순서가 유지될 필요는 없지만 값 집합은 보존된다', () => {
    const input = items(5, 5, 3, 5, 1);
    const { sorted } = MaxHeap.heapsort(input);
    expect(sorted.map((x) => x.score).sort((a, b) => b - a)).toEqual([5, 5, 5, 3, 1]);
    expect(sorted).toHaveLength(5);
  });

  it('원본 배열을 변형하지 않는다', () => {
    const input = items(3, 1, 2);
    MaxHeap.heapsort(input);
    expect(input.map((x) => x.score)).toEqual([3, 1, 2]);
  });

  it('Array.sort 결과와 일치한다 (랜덤성 없는 고정 케이스 다수)', () => {
    const cases = [[], [1], [2, 1], [1, 2, 3], [3, 3, 3], [10, -1, 5, 5, 0, 100, 7]];
    for (const c of cases) {
      const { sorted } = MaxHeap.heapsort(items(...c));
      const expected = [...c].sort((a, b) => b - a);
      expect(sorted.map((x) => x.score)).toEqual(expected);
    }
  });

  it('비교 횟수를 집계한다 (n>1 이면 1회 이상)', () => {
    const { comparisons } = MaxHeap.heapsort(items(1, 2, 3, 4, 5));
    expect(comparisons).toBeGreaterThan(0);
  });
});

describe('trace 함수 — 단계별 시각화', () => {
  it('traceInsert 의 최종 배열은 힙 속성을 만족', () => {
    const steps = traceInsert([9, 7, 8, 3, 6], 10);
    const final = steps[steps.length - 1].array.map((score) => ({ score }));
    expect(isMaxHeap(final)).toBe(true);
    expect(final[0].score).toBe(10); // 10이 루트까지 올라감
  });

  it('traceInsert 는 최소 1스텝 이상을 만든다', () => {
    expect(traceInsert([], 5).length).toBeGreaterThan(0);
    expect(traceInsert([5, 3, 4], 1).length).toBeGreaterThan(0);
  });

  it('traceExtractMax 의 최종 배열도 힙 속성을 만족하고 크기가 1 줄어든다', () => {
    const start = [10, 8, 9, 4, 7, 5];
    const steps = traceExtractMax(start);
    const final = steps[steps.length - 1].array.map((score) => ({ score }));
    expect(isMaxHeap(final)).toBe(true);
    expect(final).toHaveLength(start.length - 1);
  });

  it('빈 힙에서 traceExtractMax 는 안내 스텝을 반환', () => {
    const steps = traceExtractMax([]);
    expect(steps).toHaveLength(1);
    expect(steps[0].note).toContain('비어');
  });
});
