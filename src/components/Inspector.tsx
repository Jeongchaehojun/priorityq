import { useState } from 'react';
import type { MaxHeap } from '../lib/MaxHeap';
import type { ScoredTask } from '../types';
import { HeapTree, type TreeNode } from './HeapTree';
import { StepThrough } from './StepThrough';

interface Props {
  heap: MaxHeap<ScoredTask>;
  comparisons: number;
  pulse: boolean;
  animate?: boolean;
}

/** 기계의 뷰 — 라이브 힙 상태와 단계별 시각화를 탭으로 전환 */
export function Inspector({ heap, comparisons, pulse, animate = false }: Props) {
  const [tab, setTab] = useState<'live' | 'step'>('live');
  const nodes: TreeNode[] = heap.a.map((t) => ({ score: t.score, id: t.id }));
  const baseScores = heap.a.map((t) => t.score);

  return (
    <div className="inspector">
      <div className="insp-head">
        <div className="lbl">
          기계의 뷰 · <b>BINARY MAX-HEAP</b>
        </div>
        <div className="insp-tag">{tab === 'live' ? 'LIVE' : 'DEMO'}</div>
      </div>
      <div className="insp-tabs">
        <button className={tab === 'live' ? 'on' : ''} onClick={() => setTab('live')}>
          현재 상태
        </button>
        <button className={tab === 'step' ? 'on' : ''} onClick={() => setTab('step')}>
          단계별 시연
        </button>
      </div>
      <div className="insp-body">
        {tab === 'live' ? (
          <>
            <p className="insp-note">
              왼쪽 목록은 힙에서 최댓값을 반복 추출(heapsort)한 <b>완전 정렬</b> 결과이고, 아래 트리는 메모리에 실제로 저장된{' '}
              <b>힙 구조</b>입니다. 부모 ≥ 두 자식만 보장하므로 형제 간 순서는 정렬되어 있지 않습니다.
            </p>
            <div className="tree-wrap">
              <HeapTree nodes={nodes} pulse={pulse} animate={animate} />
            </div>
            <div className="metrics">
              <div className="metric">
                <div className="k">노드 수 n</div>
                <div className="v">{heap.size()}</div>
              </div>
              <div className="metric">
                <div className="k">트리 높이</div>
                <div className="v">
                  {heap.height()} <small>⌊log₂n⌋</small>
                </div>
              </div>
              <div className="metric">
                <div className="k">정렬 비교횟수</div>
                <div className="v">{comparisons}</div>
              </div>
              <div className="metric">
                <div className="k">루트(최우선)</div>
                <div className="v">{heap.peek() ? heap.peek()!.score : '—'}</div>
              </div>
            </div>
            <div className="arr-label">힙 배열 표현 — a[i]의 자식 = a[2i+1], a[2i+2]</div>
            <div className="arr">
              {heap.a.length === 0 ? (
                <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--faint)' }}>[ empty ]</span>
              ) : (
                heap.a.map((t, i) => (
                  <span key={i} className={'cell' + (i === 0 ? ' root' : '')}>
                    <span className="idx">{i}</span>
                    {t.score}
                  </span>
                ))
              )}
            </div>
            <p className="complexity-note">
              삽입·삭제 <b>O(log n)</b> · 정렬 출력 <b>O(n log n)</b>
            </p>
          </>
        ) : (
          <StepThrough baseScores={baseScores} />
        )}
      </div>
    </div>
  );
}
