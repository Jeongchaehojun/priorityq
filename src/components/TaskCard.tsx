import type { MouseEvent } from 'react';
import type { ScoredTask } from '../types';
import { IMPORTANCE_META, dueLabel, buildWhy } from '../lib/scoring';
import { Icon } from './icons';

interface Props {
  task: ScoredTask;
  rank: number;
  maxScore: number;
  pulse: boolean;
  expanded: boolean;
  onToggleExpand: (id: string) => void;
  onToggle: (id: string) => void;
  onEdit: (task: ScoredTask) => void;
  onRemove: (id: string) => void;
}

/** 우선순위 목록의 카드 한 장 — 기본은 제목만, 클릭하면 세부정보 펼침 */
export function TaskCard({ task, rank, maxScore, pulse, expanded, onToggleExpand, onToggle, onEdit, onRemove }: Props) {
  const im = IMPORTANCE_META[task.importance];
  const pct = Math.min(100, Math.max(8, (task.score / maxScore) * 100));
  const dl = dueLabel(task.dueDate);

  const stop = (fn: () => void) => (e: MouseEvent) => {
    e.stopPropagation();
    fn();
  };

  return (
    <article className={'card' + (expanded ? ' open' : '') + (pulse ? ' enter' : '')}>
      <div className="spine" style={{ background: im.color }} />

      <div
        className="card-head"
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={() => onToggleExpand(task.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggleExpand(task.id);
          }
        }}
      >
        <div className="rank">{rank + 1}</div>
        <button className="chk" onClick={stop(() => onToggle(task.id))} title="완료">
          {Icon.checkInk}
        </button>
        <h3 className="ctitle">{task.title}</h3>
        {!expanded && <span className="head-score">{task.score}</span>}
        <span className="chev">{Icon.chevron}</span>
      </div>

      {expanded && (
        <div className="card-detail">
          <div className="badges">
            <span className="badge" style={{ color: im.color, background: im.bg }}>
              {im.label}
            </span>
            {dl && (
              <span className="badge" style={task.urgency >= 4 ? { color: 'var(--p4)', background: 'var(--p4-bg)' } : undefined}>
                {dl}
              </span>
            )}
            <span className="badge">{task.energyLevel === 'high' ? '몰입' : '저전력'}</span>
            {task.aiBonus > 0 && (
              <span className="badge" style={{ color: 'var(--signal)', background: 'var(--signal-soft)' }}>
                {Icon.spark} +{task.aiBonus}
              </span>
            )}
          </div>
          <p className="why">
            <span className="arrow">└</span>
            <span>{buildWhy(task, rank)}</span>
          </p>
          <div className="score-row">
            <div className="score-track">
              <div className="score-fill" style={{ width: pct + '%', background: `linear-gradient(90deg,${im.color}88,${im.color})` }} />
            </div>
            <span className="score-num">
              <b>{task.score}</b> / {maxScore} pts
            </span>
          </div>
          <div className="detail-actions">
            <button className="btn btn-ghost" onClick={stop(() => onEdit(task))}>
              {Icon.edit} 수정
            </button>
            <button className="btn btn-ghost danger" onClick={stop(() => onRemove(task.id))}>
              {Icon.trash} 삭제
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
