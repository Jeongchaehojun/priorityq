import { useMemo } from 'react';
import type { Task, Importance } from '../types';
import { scoreOf, IMPORTANCE_META } from '../lib/scoring';

interface Props {
  tasks: Task[];
}

/** 완료율·중요도 분포 등 한눈에 보는 통계 대시보드 */
export function StatsDashboard({ tasks }: Props) {
  const s = useMemo(() => {
    const active = tasks.filter((t) => !t.done);
    const done = tasks.filter((t) => t.done);
    const scores = active.map((t) => scoreOf(t));
    const total = tasks.length;
    const completionRate = total === 0 ? 0 : Math.round((done.length / total) * 100);
    const avg = scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : 0;
    const top = scores.length ? Math.max(...scores) : 0;

    const byImportance: Record<Importance, number> = { 4: 0, 3: 0, 2: 0, 1: 0 };
    active.forEach((t) => byImportance[t.importance]++);

    const highEnergy = active.filter((t) => t.energyLevel === 'high').length;
    const lowEnergy = active.length - highEnergy;
    const dueSoon = active.filter((t) => {
      if (!t.dueDate) return false;
      const days = Math.ceil((new Date(t.dueDate).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86_400_000);
      return days <= 1;
    }).length;

    return { active, done, completionRate, avg, top, byImportance, highEnergy, lowEnergy, dueSoon };
  }, [tasks]);

  const maxImpCount = Math.max(1, ...Object.values(s.byImportance));
  const energyTotal = Math.max(1, s.highEnergy + s.lowEnergy);

  return (
    <div className="stats">
      <div className="stat-grid">
        <div className="stat-card">
          <div className="label">활성 할 일</div>
          <div className="big">{s.active.length}</div>
          <div className="sub">완료 {s.done.length}건</div>
        </div>
        <div className="stat-card">
          <div className="label">완료율</div>
          <div className="big">{s.completionRate}%</div>
          <div className="sub">전체 {tasks.length}건 중</div>
        </div>
        <div className="stat-card">
          <div className="label">최우선 점수</div>
          <div className="big">{s.top || '—'}</div>
          <div className="sub">평균 {s.avg}점</div>
        </div>
        <div className="stat-card">
          <div className="label">임박 (D-1 이내)</div>
          <div className="big" style={{ color: s.dueSoon > 0 ? 'var(--signal)' : undefined }}>
            {s.dueSoon}
          </div>
          <div className="sub">즉시 처리 권장</div>
        </div>
      </div>

      <div className="dist-block">
        <h4>중요도 분포 (활성)</h4>
        {([4, 3, 2, 1] as const).map((k) => {
          const meta = IMPORTANCE_META[k];
          const count = s.byImportance[k];
          return (
            <div className="dist-row" key={k}>
              <span className="name">{meta.label}</span>
              <div className="dist-bar">
                <div className="fill" style={{ width: (count / maxImpCount) * 100 + '%', background: meta.color }} />
              </div>
              <span className="val">{count}</span>
            </div>
          );
        })}
      </div>

      <div className="dist-block">
        <h4>에너지 분포 (활성)</h4>
        <div className="dist-row">
          <span className="name">몰입</span>
          <div className="dist-bar">
            <div className="fill" style={{ width: (s.highEnergy / energyTotal) * 100 + '%', background: 'var(--p2)' }} />
          </div>
          <span className="val">{s.highEnergy}</span>
        </div>
        <div className="dist-row">
          <span className="name">저전력</span>
          <div className="dist-bar">
            <div className="fill" style={{ width: (s.lowEnergy / energyTotal) * 100 + '%', background: 'var(--p1)' }} />
          </div>
          <span className="val">{s.lowEnergy}</span>
        </div>
      </div>
    </div>
  );
}
