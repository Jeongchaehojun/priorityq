import type { Task } from '../types';

/** 시연용 초기 데이터 — 첫 실행 시 큐를 채워 보여준다 */
export function seed(): Task[] {
  const day = (n: number | null): string | null =>
    n === null ? null : new Date(Date.now() + n * 86_400_000).toISOString();
  const now = new Date().toISOString();
  return [
    {
      id: 's1',
      title: '내일 오전 교수님께 중간발표 자료 제출',
      importance: 4,
      dueDate: day(1),
      aiBonus: 2,
      energyLevel: 'high',
      reason: "'제출' → 긴급 신호 · 외부·핵심 관계자('교수') +2",
      source: '규칙기반',
      done: false,
      createdAt: now,
    },
    {
      id: 's2',
      title: '팀 회의록 정리해서 슬랙에 공유',
      importance: 3,
      dueDate: day(2),
      aiBonus: 1,
      energyLevel: 'low',
      reason: "'회의' → 우선 처리 · 팀 협업('슬랙') +1",
      source: '규칙기반',
      done: false,
      createdAt: now,
    },
    {
      id: 's3',
      title: '알고리즘 과제 디버깅하기',
      importance: 3,
      dueDate: day(3),
      aiBonus: 1,
      energyLevel: 'high',
      reason: "'과제' → 우선 처리 · 팀 협업 +1",
      source: '규칙기반',
      done: false,
      createdAt: now,
    },
    {
      id: 's4',
      title: '읽고 싶었던 아티클 스크랩 정리',
      importance: 1,
      dueDate: null,
      aiBonus: 0,
      energyLevel: 'low',
      reason: "'스크랩' → 여유 업무",
      source: '규칙기반',
      done: false,
      createdAt: now,
    },
    {
      id: 's5',
      title: '동아리 회비 정산 메일 회신',
      importance: 2,
      dueDate: day(5),
      aiBonus: 0,
      energyLevel: 'low',
      reason: '특이 키워드 없음 → 보통(2)',
      source: '규칙기반',
      done: false,
      createdAt: now,
    },
    ...completedHistory(),
  ];
}

/** 캘린더/그래프 시연용 — 최근 며칠간 "완료한 일" 이력.
 *  [완료 며칠 전, 그날 완료한 제목들] 형태로 정의한다. */
function completedHistory(): Task[] {
  const at = (n: number): string => new Date(Date.now() + n * 86_400_000).toISOString();
  const plan: Array<[number, string[]]> = [
    [-1, ['UI 목업 피드백 반영', '발표 리허설 1회']],
    [-2, ['주간 회의록 작성']],
    [-3, ['MaxHeap 단위테스트 보강', '점수공식 문서화', '코드 리뷰 코멘트 반영']],
    [-5, ['레퍼런스 자료 조사']],
    [-6, ['프로젝트 셋업(Vite 마이그레이션)', '컴포넌트 분리 리팩터링']],
    [-9, ['주제 선정 회의']],
  ];
  const out: Task[] = [];
  let n = 0;
  for (const [offset, titles] of plan) {
    for (const title of titles) {
      const ts = at(offset);
      out.push({
        id: `h${n++}`,
        title,
        importance: 2,
        dueDate: null,
        aiBonus: 0,
        energyLevel: 'low',
        reason: '완료된 업무',
        source: '규칙기반',
        done: true,
        createdAt: ts,
        completedAt: ts,
      });
    }
  }
  return out;
}
