export type Mode = 'normal' | 'fun';

interface Props {
  dateStr: string;
}

export function Masthead({ dateStr }: Props) {
  return (
    <header className="masthead">
      <div className="mast-top">
        <div>
          <div className="eyebrow">Priority Queue</div>
          <h1 className="title">우선순위 큐 할 일 관리자</h1>
          <p className="kor-sub">
            중요도와 마감을 이진 힙이 스스로 저울질해 다음에 할 일을 정하고, 그 판단의 이유까지 보여줍니다.
          </p>
        </div>
        <div className="mast-date">{dateStr}</div>
      </div>
    </header>
  );
}
