import { Icon } from './icons';

interface Props {
  input: string;
  setInput: (v: string) => void;
  adding: boolean;
  analyzing: boolean;
  aiOn: boolean;
  aiName: string;
  open: () => void;
  close: () => void;
  onAnalyze: () => void;
  onManualAdd: () => void;
}

/** 목록 맨 아래의 할 일 추가 칸 — 평소엔 "+ 할 일 추가", 누르면 인라인 입력 */
export function AddTask({ input, setInput, adding, analyzing, aiOn, aiName, open, close, onAnalyze, onManualAdd }: Props) {
  if (!adding) {
    return (
      <button className="add-row" onClick={open}>
        {Icon.plus} 할 일 추가
      </button>
    );
  }
  return (
    <div className="add-inline">
      <input
        className="txt"
        autoFocus
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onAnalyze();
          if (e.key === 'Escape') close();
        }}
        placeholder="할 일을 적어보세요 — 예) 내일 오전 교수님께 중간발표 자료 제출"
        disabled={analyzing}
      />
      <button className="btn btn-ghost" onClick={onManualAdd} disabled={!input.trim() || analyzing}>
        수동
      </button>
      <button className="btn btn-primary" onClick={onAnalyze} disabled={!input.trim() || analyzing}>
        {analyzing ? (
          <>
            <span className="spin">{Icon.spark}</span> {aiOn ? `${aiName} 분석 중…` : '분석 중…'}
          </>
        ) : (
          <>
            {Icon.spark} {aiOn ? 'AI 분석 후 추가' : '분석 후 추가'}
          </>
        )}
      </button>
      <button className="icon-btn" onClick={close} title="닫기" aria-label="닫기" disabled={analyzing}>
        {Icon.x}
      </button>
    </div>
  );
}
