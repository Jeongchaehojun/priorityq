export interface ToastData {
  msg: string;
  kind: 'ok' | 'warn';
}

export function Toast({ data }: { data: ToastData }) {
  return (
    <div className="toast">
      <span className="dotw" style={{ background: data.kind === 'warn' ? 'var(--p3)' : 'var(--p1)' }} />
      {data.msg}
    </div>
  );
}
