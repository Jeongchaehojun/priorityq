import { useEffect, useRef, useState } from 'react';
import { traceInsert, traceExtractMax, type HeapStep } from '../lib/MaxHeap';
import { HeapTree, type TreeNode } from './HeapTree';
import { Icon } from './icons';

interface Props {
  /** 현재 라이브 힙의 점수 배열 (시작 상태) */
  baseScores: number[];
}

const toNodes = (scores: number[]): TreeNode[] => scores.map((score) => ({ score }));

/**
 * 힙 연산(siftUp / siftDown)을 한 스텝씩 재생하는 시각화기.
 * 자료구조 시연의 하이라이트 — "정렬되는 과정"을 눈으로 보여준다.
 */
export function StepThrough({ baseScores }: Props) {
  const [steps, setSteps] = useState<HeapStep[]>([]);
  const [idx, setIdx] = useState(0);
  const [opLabel, setOpLabel] = useState('');
  const [insertVal, setInsertVal] = useState('15');
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = () => {
    setSteps([]);
    setIdx(0);
    setOpLabel('');
    setPlaying(false);
  };

  // baseScores 가 바뀌면(큐 변경) 진행 중인 데모를 초기화
  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseScores.join(',')]);

  const runInsert = () => {
    const v = parseInt(insertVal, 10);
    if (Number.isNaN(v)) return;
    setSteps(traceInsert(baseScores, v));
    setIdx(0);
    setOpLabel(`insert(${v})`);
    setPlaying(false);
  };

  const runExtract = () => {
    setSteps(traceExtractMax(baseScores));
    setIdx(0);
    setOpLabel('extractMax()');
    setPlaying(false);
  };

  // 자동 재생
  useEffect(() => {
    if (!playing) return;
    if (idx >= steps.length - 1) {
      setPlaying(false);
      return;
    }
    timer.current = setTimeout(() => setIdx((i) => Math.min(i + 1, steps.length - 1)), 850);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [playing, idx, steps.length]);

  const active = steps.length > 0;
  const current = active ? steps[idx] : null;
  const treeScores = current ? current.array : baseScores;
  const highlight = current ? current.highlight : [];
  const atEnd = idx >= steps.length - 1;

  return (
    <div>
      <p className="insp-note">
        현재 힙에 직접 <b>삽입</b>하거나 최댓값을 <b>추출</b>해 보세요. siftUp·siftDown 의 비교와 교환이 한 단계씩 재생됩니다.{' '}
        <b>실제 큐는 바뀌지 않는 안전한 데모입니다.</b>
      </p>

      <div className="step-input">
        <input
          type="number"
          value={insertVal}
          onChange={(e) => setInsertVal(e.target.value)}
          aria-label="삽입할 점수"
        />
        <button className="sbtn go" onClick={runInsert}>
          {Icon.spark} insert
        </button>
        <button className="sbtn" onClick={runExtract} disabled={baseScores.length === 0}>
          extractMax
        </button>
      </div>

      <div className="tree-wrap">
        <HeapTree nodes={toNodes(treeScores)} highlight={highlight} />
      </div>

      {active && (
        <>
          <div className="step-note">{current!.note}</div>
          <div className="step-ctrl">
            <button className="sbtn" onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0}>
              {Icon.prev} 이전
            </button>
            <button className="sbtn" onClick={() => setIdx((i) => Math.min(steps.length - 1, i + 1))} disabled={atEnd}>
              다음 {Icon.next}
            </button>
            <button className="sbtn" onClick={() => setPlaying((p) => !p)} disabled={atEnd}>
              {Icon.play} {playing ? '일시정지' : '재생'}
            </button>
            <button className="sbtn" onClick={reset}>
              {Icon.reset} 초기화
            </button>
            <span className="step-counter">
              {opLabel} · {idx + 1}/{steps.length}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
