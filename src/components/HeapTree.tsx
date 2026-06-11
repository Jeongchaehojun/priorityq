/** 힙을 이진 트리로 그리는 SVG. 라이브 뷰와 단계별 시각화가 공유한다.
 *  색은 우선순위가 아니라 "구조"만 표현 — 모노톤(인디고 계열),
 *  루트(최댓값)만 강조하고, 단계별 시연에서 보고 있는 노드는 진한 링으로 표시.
 *
 *  animate=true 이면 노드를 id 기준으로 추적해, 힙이 재정렬될 때
 *  각 노드가 새 자리(슬롯)로 스르륵 미끄러진다. (에지는 고정 골격) */

export interface TreeNode {
  score: number;
  id?: string;
}

interface Props {
  nodes: TreeNode[];
  /** 강조할 인덱스(비교/이동 중인 노드) */
  highlight?: number[];
  /** 루트를 펄스 애니메이션 (삽입 직후 등) */
  pulse?: boolean;
  /** 재정렬 시 노드가 미끄러지는 애니메이션 */
  animate?: boolean;
}

const FILL = '#DBDEEC'; // 일반 노드 — 부드러운 인디고-그레이
const FILL_ROOT = '#5B61D6'; // 루트 — 액센트 인디고
const TEXT = '#3A3A4A';
const TEXT_ROOT = '#FFFFFF';
const EDGE = '#E1E1DD';
const RING_HOT = '#1C1C1E';

export function HeapTree({ nodes, highlight = [], pulse = false, animate = false }: Props) {
  if (nodes.length === 0) {
    return (
      <svg viewBox="0 0 320 120">
        <text x="160" y="64" textAnchor="middle" fill="#B4B4BA" fontFamily="var(--mono)" fontSize="12.5">
          heap is empty
        </text>
      </svg>
    );
  }

  const levels = Math.floor(Math.log2(nodes.length)) + 1;
  const W = 360;
  const rowH = 74;
  const R = 23;
  const TOP = 44; // 루트 위 ROOT 라벨 공간 확보
  const H = (levels - 1) * rowH + TOP + R + 14;

  const pos = (i: number) => {
    const lvl = Math.floor(Math.log2(i + 1));
    const start = Math.pow(2, lvl) - 1;
    const inLvl = i - start;
    const count = Math.pow(2, lvl);
    return { x: (W * (inLvl + 0.5)) / count, y: lvl * rowH + TOP };
  };

  // 에지: 슬롯(인덱스) 사이의 고정 골격
  const edges = nodes.map((_, i) => {
    if (i === 0) return null;
    const p = pos(i);
    const pp = pos((i - 1) >> 1);
    return <line key={'e' + i} x1={pp.x} y1={pp.y} x2={p.x} y2={p.y} stroke={EDGE} strokeWidth="1.8" />;
  });

  const transition = animate ? 'transform .5s cubic-bezier(.34,1.1,.4,1)' : undefined;

  const circles = nodes.map((n, i) => {
    const p = pos(i);
    const isRoot = i === 0;
    const hot = highlight.includes(i);
    const isPulse = pulse && isRoot;
    const key = n.id != null ? n.id : 'i' + i;
    return (
      <g key={key} style={{ transform: `translate(${p.x}px, ${p.y}px)`, transition }}>
        <circle
          cx={0}
          cy={0}
          r={R + (isRoot ? 1.5 : 0)}
          fill={isRoot ? FILL_ROOT : FILL}
          stroke={hot ? RING_HOT : 'transparent'}
          strokeWidth={hot ? 2.5 : 0}
          className={isPulse ? 'node-pulse' : ''}
        />
        <text x={0} y={5} textAnchor="middle" fill={isRoot ? TEXT_ROOT : TEXT} fontFamily="var(--mono)" fontSize="15" fontWeight="600">
          {n.score}
        </text>
        {isRoot && (
          <text x={0} y={-R - 7} textAnchor="middle" fill="#9499C9" fontFamily="var(--mono)" fontSize="9" letterSpacing="1">
            ROOT
          </text>
        )}
      </g>
    );
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`}>
      {edges}
      {circles}
    </svg>
  );
}
