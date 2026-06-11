import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import type { Draft, ScoredTask, Task } from './types';
import { MaxHeap } from './lib/MaxHeap';
import { scoreOf, urgencyFromDue, MAX_POSSIBLE_SCORE, dateInputFromOffset } from './lib/scoring';
import { runAnalyzer, manualAnalysis, getApiKey, setApiKey, hasApiKey, aiLabel } from './lib/analyzers';
import { ENERGY_STRATEGIES, getEnergyStrategy } from './lib/energyStrategies';
import { playPop, playDing, confetti } from './lib/funfx';
import { useTasks } from './hooks/useTasks';

import { Masthead, type Mode } from './components/Masthead';
import { NowServing } from './components/NowServing';
import { AddTask } from './components/AddTask';
import { DraftCard } from './components/DraftCard';
import { TaskCard } from './components/TaskCard';
import { SearchBar } from './components/SearchBar';
import { EditModal } from './components/EditModal';
import { Inspector } from './components/Inspector';
import { StatsDashboard } from './components/StatsDashboard';
import { CalendarPanel } from './components/CalendarPanel';
import { Toast, type ToastData } from './components/Toast';
import { Icon } from './components/icons';

type View = 'queue' | 'archive' | 'stats' | 'calendar';

// 에너지 모드 전환 연출 — 모드별 화면 색상
const ENERGY_FX: Record<string, { from: string; to: string }> = {
  all: { from: '#5B61D6', to: '#7C5FD0' },
  high: { from: '#4A50C5', to: '#7C3AED' }, // 몰입 — 깊은 집중(진한 인디고~퍼플)
  low: { from: '#3FA7B5', to: '#4E9374' }, // 저전력 — 차분함(틸~그린)
};
const efGradient = (k: string) => {
  const c = ENERGY_FX[k] ?? ENERGY_FX.all;
  return `radial-gradient(circle at 28% 30%, ${c.from}, transparent 62%),
          radial-gradient(circle at 74% 70%, ${c.to}, transparent 64%),
          linear-gradient(135deg, ${c.from}, ${c.to})`;
};

export default function App() {
  const { tasks, loaded, add, update, toggle, remove, reset } = useTasks();

  const [view, setView] = useState<View>('queue');
  const [mode, setMode] = useState<Mode>(() => {
    try {
      return localStorage.getItem('pq_mode') === 'fun' ? 'fun' : 'normal';
    } catch {
      return 'normal';
    }
  });
  const [flash, setFlash] = useState(false);
  const [energy, setEnergy] = useState('all');
  const [energyFx, setEnergyFx] = useState<{ id: number; key: string; label: string } | null>(null);
  const efSeq = useRef(0);
  const efTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [adding, setAdding] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Task | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [pulseScore, setPulseScore] = useState<number | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiOn, setAiOn] = useState(() => hasApiKey());
  const [aiName, setAiName] = useState(() => aiLabel());

  useEffect(() => {
    try {
      localStorage.setItem('pq_mode', mode);
    } catch {
      /* ignore */
    }
  }, [mode]);
  const fun = mode === 'fun';

  // 모드 전환 — 재미 모드로 들어갈 때 화면 전체 컬러 플래시(1초)
  const changeMode = (m: Mode) => {
    if (m === 'fun' && mode !== 'fun') {
      setFlash(true);
      setTimeout(() => setFlash(false), 1000);
      playPop();
    }
    setMode(m);
  };

  const fire = (msg: string, kind: ToastData['kind'] = 'ok') => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 2600);
  };

  // 에너지 모드 전환 — 화면 중앙에 큰 라벨이 뜨며 전체 컬러 플래시(약 1초)
  const changeEnergy = (key: string) => {
    setEnergy(key);
    const label = getEnergyStrategy(key).label;
    setEnergyFx({ id: ++efSeq.current, key, label });
    if (fun) playPop();
    if (efTimer.current) clearTimeout(efTimer.current);
    efTimer.current = setTimeout(() => setEnergyFx(null), 1050);
  };

  // 완료 토글 — 재미 모드면 완료 시 "톡" 사운드
  const handleToggle = (id: string) => {
    const t = tasks.find((x) => x.id === id);
    if (fun && t && !t.done) playPop();
    toggle(id);
  };

  // 큐 맨 앞 처리(dequeue) — 재미 모드 연출
  const dequeue = (id: string, e: MouseEvent) => {
    toggle(id);
    if (fun) {
      playDing();
      confetti(e.clientX, e.clientY);
    }
  };

  // ---- compose / commit ----
  // AI(Claude) 분석 시도 → 실패·타임아웃이면 규칙기반으로 자동 폴백
  const analyze = async () => {
    const title = input.trim();
    if (!title || analyzing) return;
    setAnalyzing(true);
    try {
      const r = await runAnalyzer(title);
      const { dueInDays, ...rest } = r;
      // 제목에서 마감 시점을 추론했으면 마감일을 미리 채워 둔다 (긴급도가 반영되도록)
      const dueDate = dueInDays != null ? dateInputFromOffset(dueInDays) : '';
      setDraft({ title, ...rest, dueDate });
      if (aiOn) fire(r.source === 'AI' ? `${aiName} 분석 완료` : '규칙기반으로 폴백했어요', r.source === 'AI' ? 'ok' : 'warn');
    } finally {
      setAnalyzing(false);
    }
  };

  // AI 키 설정 — 이 브라우저에만 저장. 비우면 규칙기반만 사용
  const configureAi = () => {
    const next = window.prompt(
      'AI 분석 키를 입력하세요.\n· Gemini → AIza… (Google AI Studio)\n· Claude → sk-ant… (Anthropic)\n비우면 규칙기반 분석만 사용합니다. 키는 이 브라우저(localStorage)에만 저장됩니다.',
      getApiKey(),
    );
    if (next === null) return;
    const key = next.trim();
    setApiKey(key);
    setAiOn(key.length > 0);
    const label = aiLabel();
    setAiName(label);
    fire(key ? `AI 분석 사용 — ${label}` : 'AI 키 제거 — 규칙기반만 사용');
  };
  const manualAdd = () => {
    if (!input.trim()) return;
    setDraft({ title: input.trim(), ...manualAnalysis(), dueDate: '' });
  };
  const commit = () => {
    if (!draft) return;
    const t: Task = {
      id: crypto.randomUUID(),
      title: draft.title,
      importance: draft.importance,
      dueDate: draft.dueDate ? new Date(draft.dueDate).toISOString() : null,
      aiBonus: draft.aiBonus,
      energyLevel: draft.energyLevel,
      reason: draft.reason,
      source: draft.source,
      done: false,
      createdAt: new Date().toISOString(),
    };
    add(t);
    const sc = scoreOf(t);
    setPulseScore(sc);
    setTimeout(() => setPulseScore(null), 1500);
    setDraft(null);
    setInput('');
    setAdding(false);
    if (fun) playPop();
    fire(`힙에 삽입 — score ${sc} · siftUp 수행`);
  };
  const cancelAdd = () => {
    setDraft(null);
    setInput('');
    setAdding(false);
  };

  const saveEdit = (patch: Partial<Task>) => {
    if (!editing) return;
    update(editing.id, patch);
    setEditing(null);
    fire('수정 완료 — 점수와 순위를 다시 계산했어요');
  };

  // 시연용 데이터 복원 — 라이브 데모 중 실수로 지웠을 때 한 번에 되돌림
  const restoreDemo = () => {
    if (!window.confirm('현재 목록을 모두 지우고 시연용 예시 데이터로 되돌릴까요?')) return;
    reset();
    setView('queue');
    setEnergy('all');
    setQuery('');
    fire('시연용 데이터를 복원했어요');
  };

  // ---- derived: score → energy filter → heapsort ----
  const strat = getEnergyStrategy(energy);
  const active: ScoredTask[] = tasks
    .filter((t) => !t.done)
    .map((t) => ({ ...t, score: scoreOf(t), urgency: urgencyFromDue(t.dueDate) }));
  const pool = active.filter(strat.filter);

  const poolKey = JSON.stringify(pool.map((t) => [t.id, t.score]));
  const { sorted, comparisons } = useMemo(() => MaxHeap.heapsort(pool), [poolKey]);
  const heapModel = useMemo(() => {
    const h = new MaxHeap<ScoredTask>();
    pool.forEach((t) => h.insert(t));
    return h;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poolKey]);

  const archive = tasks.filter((t) => t.done).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  const maxScore = sorted.length ? Math.max(sorted[0].score, 1) : MAX_POSSIBLE_SCORE;

  const q = query.trim().toLowerCase();
  const matches = (t: ScoredTask) => !q || t.title.toLowerCase().includes(q);
  const visible = sorted.map((t, i) => ({ t, rank: i })).filter(({ t }) => matches(t));

  // 최초 로드 시 1순위 카드를 펼쳐 둔다 — "왜 이 순위인지"(이 프로젝트의 핵심)를 첫 화면에서 바로 보여주기 위함
  const didAutoExpand = useRef(false);
  useEffect(() => {
    if (!loaded || didAutoExpand.current || sorted.length === 0) return;
    setExpandedId(sorted[0].id);
    didAutoExpand.current = true;
  }, [loaded, sorted]);

  if (!loaded) return null;

  const today = new Date();
  const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;

  return (
    <div className="wrap">
      <Masthead dateStr={dateStr} />

      <div className="mode-bar">
        <div className="mode-toggle" role="group" aria-label="모드 전환">
          <button className={mode === 'normal' ? 'on' : ''} onClick={() => changeMode('normal')}>
            일반 모드
          </button>
          <button className={mode === 'fun' ? 'on sig' : ''} onClick={() => changeMode('fun')}>
            ✦ 재미 모드
          </button>
        </div>
      </div>

      <div className="nav-bar">
        <div className="tabs">
          <button className={view === 'queue' ? 'on' : ''} onClick={() => setView('queue')}>
            큐 목록
          </button>
          <button className={view === 'archive' ? 'on' : ''} onClick={() => setView('archive')}>
            완료됨 ({archive.length})
          </button>
          <button className={view === 'stats' ? 'on' : ''} onClick={() => setView('stats')}>
            통계
          </button>
          <button className={view === 'calendar' ? 'on' : ''} onClick={() => setView('calendar')}>
            캘린더
          </button>
        </div>
        <div className="nav-actions">
          <button
            className={'ai-chip' + (aiOn ? ' on' : '')}
            onClick={configureAi}
            title="AI(Claude) 분석 키 설정 — 비우면 규칙기반만 사용"
          >
            {Icon.spark} {aiOn ? `${aiName} 켜짐` : 'AI 꺼짐'}
          </button>
          <button className="btn btn-ghost restore" onClick={restoreDemo} title="시연용 예시 데이터로 되돌리기">
            {Icon.reset} 데모 복원
          </button>
        </div>
      </div>

      <div className="stage">
        {/* LEFT — human view */}
        <section>
          <div className="section-head">
            <h2>
              {view === 'queue'
                ? '사람의 뷰 — 우선순위 목록'
                : view === 'archive'
                  ? '완료 아카이브'
                  : view === 'stats'
                    ? '통계 대시보드'
                    : '완료 캘린더'}
            </h2>
            {view === 'queue' ? (
              <div className="tabs">
                {ENERGY_STRATEGIES.map((s) => (
                  <button key={s.key} className={energy === s.key ? 'on' : ''} onClick={() => changeEnergy(s.key)} title={s.hint}>
                    {s.label}
                  </button>
                ))}
              </div>
            ) : view === 'archive' ? (
              <span className="count">{archive.length}건</span>
            ) : view === 'stats' ? (
              <span className="count">{tasks.length}건 집계</span>
            ) : null}
          </div>

          {view === 'queue' && (
            <>
              {fun && <NowServing task={sorted[0] ?? null} onDequeue={dequeue} />}
              <SearchBar value={query} onChange={setQuery} />
              {sorted.length === 0 ? (
                <div className="empty">
                  <div className="ico">∅</div>
                  <p>큐가 비었습니다. 할 일을 추가하면 힙이 자동으로 정렬합니다.</p>
                  <button className="btn btn-ghost" style={{ marginTop: '14px' }} onClick={restoreDemo}>
                    {Icon.reset} 시연용 데이터 복원
                  </button>
                </div>
              ) : visible.length === 0 ? (
                <div className="empty">
                  <div className="ico">?</div>
                  <p>“{query}”와 일치하는 할 일이 없습니다.</p>
                </div>
              ) : (
                visible.map(({ t, rank }) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    rank={rank}
                    maxScore={maxScore}
                    pulse={pulseScore === t.score}
                    expanded={expandedId === t.id}
                    onToggleExpand={(id) => setExpandedId((cur) => (cur === id ? null : id))}
                    onToggle={handleToggle}
                    onEdit={(task) => setEditing(task)}
                    onRemove={remove}
                  />
                ))
              )}

              {/* 목록 맨 아래 — 추가 칸 / 분석 결과 확인 */}
              {draft ? (
                <DraftCard draft={draft} setDraft={setDraft} onCancel={cancelAdd} onCommit={commit} />
              ) : (
                <AddTask
                  input={input}
                  setInput={setInput}
                  adding={adding}
                  analyzing={analyzing}
                  aiOn={aiOn}
                  aiName={aiName}
                  open={() => setAdding(true)}
                  close={cancelAdd}
                  onAnalyze={analyze}
                  onManualAdd={manualAdd}
                />
              )}
            </>
          )}

          {view === 'archive' &&
            (archive.length === 0 ? (
              <div className="empty">
                <div className="ico">—</div>
                <p>완료된 업무가 아직 없습니다.</p>
              </div>
            ) : (
              archive.map((t) => (
                <div key={t.id} className="arch-item">
                  <div className="arch-chk" onClick={() => toggle(t.id)}>
                    {Icon.check}
                  </div>
                  <span className="ttl">{t.title}</span>
                  <button className="icon-btn danger" onClick={() => remove(t.id)} title="삭제">
                    {Icon.trash}
                  </button>
                </div>
              ))
            ))}

          {view === 'stats' && <StatsDashboard tasks={tasks} />}

          {view === 'calendar' && <CalendarPanel tasks={tasks} />}
        </section>

        {/* RIGHT — machine view */}
        <aside>
          <Inspector heap={heapModel} comparisons={comparisons} pulse={pulseScore !== null} animate={fun} />
        </aside>
      </div>

      <footer className="foot">
        <div>
          PRIORITY QUEUE TASK MANAGER · <b>v2.1</b> — 소프트웨어공학 팀프로젝트 / 주제 8
        </div>
        <div>
          핵심 자료구조 <b>MaxHeap</b> · 설계 패턴 <b>Strategy ×2</b> · 점수공식 <b>중요도×긴급도+가중치</b>
        </div>
      </footer>

      {editing && <EditModal task={editing} onSave={saveEdit} onClose={() => setEditing(null)} />}
      {toast && <Toast data={toast} />}
      {flash && <div className="mode-flash" aria-hidden="true" />}
      {energyFx && (
        <div key={energyFx.id} className="energy-flash" style={{ background: efGradient(energyFx.key) }} aria-hidden="true">
          <div className="ef-label">
            <span className="ef-key">ENERGY MODE</span>
            {energyFx.label}
          </div>
        </div>
      )}
    </div>
  );
}
