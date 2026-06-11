/* =========================================================================
   FUN FX — 재미 모드용 사운드 & 컨페티 (외부 의존성 없음)
   · 사운드: Web Audio API 로 짧게 합성 (에셋 불필요)
   · 컨페티: 일회성 캔버스에 파티클을 그려 떨어뜨린 뒤 스스로 제거
   ========================================================================= */

let audioCtx: AudioContext | null = null;
function ctx(): AudioContext | null {
  try {
    if (!audioCtx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtx = new AC();
    }
    if (audioCtx.state === 'suspended') void audioCtx.resume();
    return audioCtx;
  } catch {
    return null;
  }
}

/** 가벼운 "톡" — 추가/완료 시 */
export function playPop(): void {
  const c = ctx();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.connect(g);
  g.connect(c.destination);
  o.type = 'triangle';
  const t = c.currentTime;
  o.frequency.setValueAtTime(430, t);
  o.frequency.exponentialRampToValueAtTime(780, t + 0.08);
  g.gain.setValueAtTime(0.16, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  o.start(t);
  o.stop(t + 0.2);
}

/** 경쾌한 2음 "딩-동" — 큐 맨 앞을 처리(dequeue)했을 때 */
export function playDing(): void {
  const c = ctx();
  if (!c) return;
  const now = c.currentTime;
  [880, 1318].forEach((f, i) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.connect(g);
    g.connect(c.destination);
    o.type = 'sine';
    o.frequency.value = f;
    const t = now + i * 0.08;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.2, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.start(t);
    o.stop(t + 0.55);
  });
}

const CONFETTI_COLORS = ['#5B61D6', '#C0564B', '#B07C32', '#4E9374', '#5F7E9B', '#E9C39B'];

interface Particle {
  x: number; y: number; vx: number; vy: number; g: number;
  size: number; rot: number; vr: number; color: string; life: number; max: number;
}

/** 컨페티 한 방. (originX, originY)에서 터진다. 없으면 화면 중상단. */
export function confetti(originX?: number, originY?: number): void {
  try {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  } catch {
    /* ignore */
  }
  const W = window.innerWidth;
  const H = window.innerHeight;
  const dpr = window.devicePixelRatio || 1;
  const canvas = document.createElement('canvas');
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:200';
  document.body.appendChild(canvas);
  const g2 = canvas.getContext('2d');
  if (!g2) {
    canvas.remove();
    return;
  }
  g2.scale(dpr, dpr);

  const ox = originX ?? W / 2;
  const oy = originY ?? H / 3;
  const N = 130;
  const parts: Particle[] = Array.from({ length: N }, () => {
    const a = Math.random() * Math.PI * 2;
    const sp = 4 + Math.random() * 8;
    return {
      x: ox, y: oy,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 7,
      g: 0.18 + Math.random() * 0.12,
      size: 5 + Math.random() * 7,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.4,
      color: CONFETTI_COLORS[(Math.random() * CONFETTI_COLORS.length) | 0],
      life: 0,
      max: 55 + Math.random() * 45,
    };
  });

  let frame = 0;
  const tick = () => {
    g2.clearRect(0, 0, W, H);
    let alive = false;
    for (const p of parts) {
      if (p.life > p.max) continue;
      p.life++;
      alive = true;
      p.vy += p.g;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      const alpha = Math.max(0, 1 - p.life / p.max);
      g2.save();
      g2.globalAlpha = alpha;
      g2.translate(p.x, p.y);
      g2.rotate(p.rot);
      g2.fillStyle = p.color;
      g2.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.62);
      g2.restore();
    }
    frame++;
    if (alive && frame < 260) requestAnimationFrame(tick);
    else canvas.remove();
  };
  requestAnimationFrame(tick);
}
