import { useMemo, useState } from 'react';
import type { Task } from '../types';
import { Icon } from './icons';

interface Props {
  tasks: Task[];
}

const DOW = ['일', '월', '화', '수', '목', '금', '토'];
const keyOf = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/** 완료 캘린더 — 날짜마다 그날 해결한 할 일 개수를 표기하고, 아래에 일별 막대그래프를 그린다 */
export function CalendarPanel({ tasks }: Props) {
  const today = new Date();
  const [ym, setYm] = useState({ y: today.getFullYear(), m: today.getMonth() });

  // 완료 시각(completedAt) 기준으로 날짜별 완료 개수 집계
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    tasks.forEach((t) => {
      if (!t.done || !t.completedAt) return;
      const k = keyOf(new Date(t.completedAt));
      m.set(k, (m.get(k) ?? 0) + 1);
    });
    return m;
  }, [tasks]);

  const { y, m } = ym;
  const firstDow = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const dayCount = (d: number) => counts.get(`${y}-${m}-${d}`) ?? 0;

  const monthTotal = useMemo(() => {
    let s = 0;
    for (let d = 1; d <= daysInMonth; d++) s += dayCount(d);
    return s;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [counts, y, m, daysInMonth]);

  const maxDay = useMemo(() => {
    let mx = 0;
    for (let d = 1; d <= daysInMonth; d++) mx = Math.max(mx, dayCount(d));
    return mx;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [counts, y, m, daysInMonth]);

  const isToday = (d: number) => y === today.getFullYear() && m === today.getMonth() && d === today.getDate();

  const shift = (delta: number) => {
    const next = new Date(y, m + delta, 1);
    setYm({ y: next.getFullYear(), m: next.getMonth() });
  };

  // 그리드 셀: 앞쪽 빈칸 + 1..말일
  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div className="cal">
      <div className="cal-head">
        <div>
          <div className="cal-title">
            {y}.{String(m + 1).padStart(2, '0')}
          </div>
          <div className="cal-sub">이번 달 완료 {monthTotal}건</div>
        </div>
        <div className="cal-nav">
          <button className="sbtn" onClick={() => shift(-1)} aria-label="이전 달">
            {Icon.prev}
          </button>
          <button className="sbtn" onClick={() => setYm({ y: today.getFullYear(), m: today.getMonth() })}>
            오늘
          </button>
          <button className="sbtn" onClick={() => shift(1)} aria-label="다음 달">
            {Icon.next}
          </button>
        </div>
      </div>

      <div className="cal-grid">
        {DOW.map((w) => (
          <div className="cal-dow" key={w}>
            {w}
          </div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div className="cal-cell empty" key={'e' + i} />;
          const c = dayCount(d);
          const ratio = maxDay ? c / maxDay : 0;
          const bg = c > 0 ? `rgba(91,97,214,${0.1 + 0.22 * ratio})` : undefined;
          return (
            <div
              className={'cal-cell' + (isToday(d) ? ' today' : '') + (c > 0 ? ' has' : '')}
              key={d}
              style={bg ? { background: bg, borderColor: '#D7D9F5' } : undefined}
              title={`${m + 1}월 ${d}일 · 완료 ${c}건`}
            >
              <span className="d">{d}</span>
              {c > 0 && (
                <span className="cnt">
                  {c}
                  <small>건</small>
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="cal-graph">
        <h4>일별 완료 추이 — {m + 1}월</h4>
        {monthTotal === 0 ? (
          <p className="cal-empty">이 달에는 완료한 할 일이 없습니다. 큐에서 할 일을 완료하면 이곳에 쌓입니다.</p>
        ) : (
          <>
            <div className="cal-bars">
              {Array.from({ length: daysInMonth }, (_, i) => {
                const d = i + 1;
                const c = dayCount(d);
                const h = maxDay ? (c / maxDay) * 100 : 0;
                return (
                  <div className="cal-bar-wrap" key={d} title={`${m + 1}월 ${d}일 · ${c}건`}>
                    <div
                      className={'cal-bar' + (isToday(d) ? ' today' : '')}
                      style={{ height: c > 0 ? `max(3px, ${h}%)` : '0' }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="cal-xaxis">
              {Array.from({ length: daysInMonth }, (_, i) => {
                const d = i + 1;
                const show = d === 1 || d % 5 === 0 || d === daysInMonth;
                return (
                  <span key={d}>{show ? d : ''}</span>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
