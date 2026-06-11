/* =========================================================================
   ENGINEERING CORE — 이진 최대-힙 (Binary Max-Heap)
   ---------------------------------------------------------------------------
   소프트웨어공학 주제 8 "공학적 포인트: Queue/Heap 자료구조"의 핵심.
   Array.prototype.sort()를 쓰지 않고 직접 구현한다.

     · insert      : O(log n)   — siftUp
     · extractMax  : O(log n)   — siftDown
     · heapsort    : O(n log n) — 반복 추출로 완전 정렬

   배열 표현: a[i]의 부모 = a[(i-1)/2], 자식 = a[2i+1], a[2i+2]
   힙 속성: 모든 부모 노드의 점수 ≥ 두 자식의 점수
   ========================================================================= */

/** 힙에 들어갈 수 있는 최소 요건: 비교 가능한 score 를 가진 객체 */
export interface Scored {
  score: number;
}

export interface OpLog {
  op: 'insert' | 'extractMax';
  val: number;
  detail: string;
}

/** 단계별 시각화를 위한 한 스텝의 스냅샷 */
export interface HeapStep {
  /** 이 스텝 직후의 점수 배열 스냅샷 */
  array: number[];
  /** 강조할 노드 인덱스(현재 보고 있는 위치) */
  highlight: number[];
  /** 비교 중인 두 인덱스 */
  compared?: [number, number];
  /** 교환이 일어난 두 인덱스 */
  swapped?: [number, number];
  /** 사람이 읽는 설명 */
  note: string;
}

export class MaxHeap<T extends Scored> {
  a: T[] = [];
  comparisons = 0;
  log: OpLog[] = [];

  size(): number {
    return this.a.length;
  }

  isEmpty(): boolean {
    return this.a.length === 0;
  }

  peek(): T | null {
    return this.a[0] ?? null;
  }

  /** 트리 높이 = ⌊log₂ n⌋ */
  height(): number {
    return this.a.length ? Math.floor(Math.log2(this.a.length)) : 0;
  }

  private pushLog(entry: OpLog): void {
    this.log.unshift(entry);
    if (this.log.length > 40) this.log.pop();
  }

  private swap(i: number, j: number): void {
    const t = this.a[i];
    this.a[i] = this.a[j];
    this.a[j] = t;
  }

  /** 마지막에 추가한 뒤 부모와 비교하며 위로 올린다 (siftUp). 반환: 교환 횟수 */
  insert(item: T): number {
    this.a.push(item);
    let i = this.a.length - 1;
    let steps = 0;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      this.comparisons++;
      if (this.a[i].score > this.a[parent].score) {
        this.swap(i, parent);
        i = parent;
        steps++;
      } else break;
    }
    this.pushLog({ op: 'insert', val: item.score, detail: `siftUp ×${steps}` });
    return steps;
  }

  /** 루트(최댓값)를 꺼내고 마지막 원소를 올린 뒤 아래로 내린다 (siftDown). */
  extractMax(): T | null {
    if (this.a.length === 0) return null;
    const max = this.a[0];
    const last = this.a.pop()!;
    let steps = 0;
    if (this.a.length > 0) {
      this.a[0] = last;
      let i = 0;
      const n = this.a.length;
      for (;;) {
        const l = 2 * i + 1;
        const r = 2 * i + 2;
        let big = i;
        if (l < n) {
          this.comparisons++;
          if (this.a[l].score > this.a[big].score) big = l;
        }
        if (r < n) {
          this.comparisons++;
          if (this.a[r].score > this.a[big].score) big = r;
        }
        if (big === i) break;
        this.swap(i, big);
        i = big;
        steps++;
      }
    }
    this.pushLog({ op: 'extractMax', val: max.score, detail: `siftDown ×${steps}` });
    return max;
  }

  /** 현재 배열을 그대로 복제 (라이브 인스펙터용) */
  clone(): MaxHeap<T> {
    const h = new MaxHeap<T>();
    h.a = [...this.a];
    h.comparisons = this.comparisons;
    h.log = [...this.log];
    return h;
  }

  /**
   * 힙 정렬: 입력을 힙에 모두 넣고 최댓값을 반복 추출 → 완전 정렬(내림차순).
   * O(n log n). 원본 배열은 변경하지 않는다.
   */
  static heapsort<T extends Scored>(items: readonly T[]): { sorted: T[]; comparisons: number } {
    const h = new MaxHeap<T>();
    for (const it of items) h.insert(it);
    const out: T[] = [];
    while (!h.isEmpty()) out.push(h.extractMax()!);
    return { sorted: out, comparisons: h.comparisons };
  }

  /** 점수 배열로부터 힙을 구성하여 인스턴스를 만든다 (시각화 보조용) */
  static fromScores(scores: number[]): MaxHeap<Scored> {
    const h = new MaxHeap<Scored>();
    for (const s of scores) h.insert({ score: s });
    return h;
  }
}

/* -------------------------------------------------------------------------
   단계별 시각화용 trace 함수
   점수(number) 배열만 다루므로 클래스와 독립적이며 테스트하기 쉽다.
   각 비교·교환마다 스냅샷을 남겨 애니메이션으로 재생할 수 있게 한다.
   ------------------------------------------------------------------------- */

/** value 한 개를 기존 힙(scores)에 삽입하는 과정을 단계별로 기록 */
export function traceInsert(scores: number[], value: number): HeapStep[] {
  const a = [...scores];
  const steps: HeapStep[] = [];
  a.push(value);
  let i = a.length - 1;
  steps.push({
    array: [...a],
    highlight: [i],
    note: `새 값 ${value} 을(를) 마지막(index ${i})에 추가`,
  });
  while (i > 0) {
    const parent = (i - 1) >> 1;
    steps.push({
      array: [...a],
      highlight: [i, parent],
      compared: [i, parent],
      note: `자식 ${a[i]} 과(와) 부모 ${a[parent]} 비교`,
    });
    if (a[i] > a[parent]) {
      [a[i], a[parent]] = [a[parent], a[i]];
      steps.push({
        array: [...a],
        highlight: [parent],
        swapped: [i, parent],
        note: `${a[parent]} > ${a[i]} → 교환 (siftUp)`,
      });
      i = parent;
    } else {
      steps.push({
        array: [...a],
        highlight: [i],
        note: `${a[i]} ≤ ${a[parent]} → 힙 속성 만족, 종료`,
      });
      break;
    }
  }
  if (i === 0 && steps[steps.length - 1].note.indexOf('종료') === -1) {
    steps.push({ array: [...a], highlight: [0], note: '루트 도달 — 새 최댓값으로 정착' });
  }
  return steps;
}

/** 루트(최댓값)를 추출하는 과정을 단계별로 기록 */
export function traceExtractMax(scores: number[]): HeapStep[] {
  const a = [...scores];
  const steps: HeapStep[] = [];
  if (a.length === 0) {
    return [{ array: [], highlight: [], note: '힙이 비어 있어 추출할 수 없음' }];
  }
  const max = a[0];
  steps.push({ array: [...a], highlight: [0], note: `루트(최댓값) ${max} 추출 예정` });
  const last = a.pop()!;
  if (a.length > 0) {
    a[0] = last;
    steps.push({
      array: [...a],
      highlight: [0],
      swapped: [0, a.length],
      note: `마지막 원소 ${last} 을(를) 루트로 이동`,
    });
    let i = 0;
    const n = a.length;
    for (;;) {
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      let big = i;
      const candidates: number[] = [i];
      if (l < n) candidates.push(l);
      if (r < n) candidates.push(r);
      if (l < n && a[l] > a[big]) big = l;
      if (r < n && a[r] > a[big]) big = r;
      steps.push({
        array: [...a],
        highlight: candidates,
        compared: candidates.length > 1 ? [i, big] : undefined,
        note:
          candidates.length > 1
            ? `부모 ${a[i]} 와(과) 자식들 비교 → 가장 큰 값 ${a[big]}`
            : `자식 없음 — 종료`,
      });
      if (big === i) {
        steps.push({ array: [...a], highlight: [i], note: '힙 속성 만족 — 종료' });
        break;
      }
      [a[i], a[big]] = [a[big], a[i]];
      steps.push({
        array: [...a],
        highlight: [big],
        swapped: [i, big],
        note: `${a[big]} 과(와) 교환하여 아래로 내림 (siftDown)`,
      });
      i = big;
    }
  } else {
    steps.push({ array: [], highlight: [], note: '마지막 원소였음 — 힙이 비었음' });
  }
  return steps;
}
