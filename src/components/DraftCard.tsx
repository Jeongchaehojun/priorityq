import type { Draft, Importance } from '../types';
import { urgencyFromDue } from '../lib/scoring';
import { Icon } from './icons';

interface Props {
  draft: Draft;
  setDraft: (d: Draft) => void;
  onCancel: () => void;
  onCommit: () => void;
}

/** 분석 결과를 확인하고 수정한 뒤 힙에 삽입하는 초안 카드 */
export function DraftCard({ draft, setDraft, onCancel, onCommit }: Props) {
  const dueISO = draft.dueDate ? new Date(draft.dueDate).toISOString() : null;
  const urgency = urgencyFromDue(dueISO);
  const previewScore = draft.importance * urgency + draft.aiBonus;

  return (
    <div className="draft">
      <div className="draft-flag">
        {Icon.spark} {draft.source} 분석 결과 · 확인 후 큐에 등록
      </div>
      <h3>{draft.title}</h3>
      <div className="reason-box">{draft.reason}</div>
      <div className="field-grid">
        <div className="field">
          <label>중요도 (제안값)</label>
          <select
            value={draft.importance}
            onChange={(e) => setDraft({ ...draft, importance: Number(e.target.value) as Importance })}
          >
            <option value={4}>긴급 (4)</option>
            <option value={3}>높음 (3)</option>
            <option value={2}>보통 (2)</option>
            <option value={1}>낮음 (1)</option>
          </select>
        </div>
        <div className="field">
          <label>에너지 레벨</label>
          <select
            value={draft.energyLevel}
            onChange={(e) => setDraft({ ...draft, energyLevel: e.target.value as Draft['energyLevel'] })}
          >
            <option value="high">몰입 — 깊은 집중 필요</option>
            <option value="low">저전력 — 가볍게 가능</option>
          </select>
        </div>
        <div className="field">
          <label>마감일 (선택)</label>
          <input type="date" value={draft.dueDate} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })} />
        </div>
      </div>
      <div className="reason-box" style={{ borderLeftColor: 'var(--p2)', marginBottom: '16px' }}>
        예상 점수 = 중요도 {draft.importance} × 긴급도 {urgency} + 가중치 {draft.aiBonus} ={' '}
        <b style={{ fontFamily: 'var(--mono)' }}>{previewScore}점</b>
      </div>
      <div className="draft-actions">
        <button className="btn btn-ghost" onClick={onCancel}>
          취소
        </button>
        <button className="btn btn-primary" onClick={onCommit}>
          힙에 삽입하기
        </button>
      </div>
    </div>
  );
}
