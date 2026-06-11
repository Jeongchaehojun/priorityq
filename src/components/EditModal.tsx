import { useState } from 'react';
import type { EnergyLevel, Importance, Task } from '../types';
import { urgencyFromDue } from '../lib/scoring';

interface Props {
  task: Task;
  onSave: (patch: Partial<Task>) => void;
  onClose: () => void;
}

const toDateInput = (iso: string | null): string => (iso ? new Date(iso).toISOString().slice(0, 10) : '');

/** 기존 할 일을 수정하는 모달 */
export function EditModal({ task, onSave, onClose }: Props) {
  const [title, setTitle] = useState(task.title);
  const [importance, setImportance] = useState<Importance>(task.importance);
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>(task.energyLevel);
  const [aiBonus, setAiBonus] = useState(task.aiBonus);
  const [dueDate, setDueDate] = useState(toDateInput(task.dueDate));

  const dueISO = dueDate ? new Date(dueDate).toISOString() : null;
  const preview = importance * urgencyFromDue(dueISO) + aiBonus;

  const save = () => {
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      importance,
      energyLevel,
      aiBonus,
      dueDate: dueISO,
    });
  };

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>할 일 수정</h3>
        <div className="field">
          <label>제목</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </div>
        <div className="field-grid">
          <div className="field">
            <label>중요도</label>
            <select value={importance} onChange={(e) => setImportance(Number(e.target.value) as Importance)}>
              <option value={4}>긴급 (4)</option>
              <option value={3}>높음 (3)</option>
              <option value={2}>보통 (2)</option>
              <option value={1}>낮음 (1)</option>
            </select>
          </div>
          <div className="field">
            <label>에너지 레벨</label>
            <select value={energyLevel} onChange={(e) => setEnergyLevel(e.target.value as EnergyLevel)}>
              <option value="high">몰입</option>
              <option value="low">저전력</option>
            </select>
          </div>
          <div className="field">
            <label>가중치</label>
            <select value={aiBonus} onChange={(e) => setAiBonus(Number(e.target.value))}>
              <option value={0}>없음 (0)</option>
              <option value={1}>협업 (+1)</option>
              <option value={2}>핵심 관계자 (+2)</option>
            </select>
          </div>
        </div>
        <div className="field">
          <label>마감일</label>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <div className="reason-box" style={{ borderLeftColor: 'var(--p2)' }}>
          예상 점수 = {importance} × {urgencyFromDue(dueISO)} + {aiBonus} ={' '}
          <b style={{ fontFamily: 'var(--mono)' }}>{preview}점</b>
        </div>
        <div className="draft-actions">
          <button className="btn btn-ghost" onClick={onClose}>
            취소
          </button>
          <button className="btn btn-primary" onClick={save} disabled={!title.trim()}>
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
