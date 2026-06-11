import type { MouseEvent } from 'react';
import type { ScoredTask } from '../types';
import { IMPORTANCE_META, dueLabel } from '../lib/scoring';

interface Props {
  task: ScoredTask | null;
  onDequeue: (id: string, e: MouseEvent) => void;
}

/** 재미 모드 — 큐의 맨 앞(최우선)을 크게 띄우고 dequeue 버튼 제공 */
export function NowServing({ task, onDequeue }: Props) {
  if (!task) return null;
  const im = IMPORTANCE_META[task.importance];
  const dl = dueLabel(task.dueDate);
  return (
    <div className="now-serving">
      <div className="ns-label">
        <span className="ns-pulse" /> NOW SERVING · 큐의 맨 앞
      </div>
      <div className="ns-title">{task.title}</div>
      <div className="ns-meta">
        우선순위 점수 <b>{task.score}</b> · {im.label}
        {dl && ` · ${dl}`}
      </div>
      <button className="ns-btn" onClick={(e) => onDequeue(task.id, e)}>
        다음 처리 (dequeue) →
      </button>
    </div>
  );
}
