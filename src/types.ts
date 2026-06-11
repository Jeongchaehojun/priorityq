/** 도메인 타입 정의 */

export type Importance = 1 | 2 | 3 | 4; // 1=낮음 2=보통 3=높음 4=긴급
export type EnergyLevel = 'high' | 'low';
export type AnalyzerSource = '규칙기반' | '수동' | 'AI';

/** 저장되는 할 일 한 건 */
export interface Task {
  id: string;
  title: string;
  importance: Importance;
  dueDate: string | null; // ISO 문자열 또는 null
  aiBonus: number; // 0 | 1 | 2 (관계자/협업 가중치)
  energyLevel: EnergyLevel;
  reason: string; // 점수가 매겨진 근거(사람이 읽는 설명)
  source: AnalyzerSource;
  done: boolean;
  createdAt: string;
  completedAt?: string | null; // 완료 처리한 시각 (캘린더 집계용)
}

/** score/urgency가 계산되어 붙은 할 일 (힙에 들어가는 형태) */
export interface ScoredTask extends Task {
  score: number;
  urgency: number;
}

/** 분석기 1회 실행 결과 */
export interface Analysis {
  importance: Importance;
  aiBonus: number;
  energyLevel: EnergyLevel;
  reason: string;
  source: AnalyzerSource;
  /** 제목의 시점 표현("내일","다음주"…)에서 추론한 마감까지의 일수 (없으면 null) */
  dueInDays?: number | null;
}

/** 큐에 등록하기 전, 사용자가 확인·수정하는 초안 */
export interface Draft {
  title: string;
  importance: Importance;
  aiBonus: number;
  energyLevel: EnergyLevel;
  reason: string;
  source: AnalyzerSource;
  dueDate: string; // input[type=date] 값 (YYYY-MM-DD 또는 '')
}
