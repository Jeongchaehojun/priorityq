/* =========================================================================
   STRATEGY 패턴 #2 — 에너지 필터(컨디션 기반 재정렬)
   ---------------------------------------------------------------------------
   지금 내 컨디션(몰입 가능 / 저전력)에 맞는 할 일만 골라 보여준다.
   각 전략은 동일한 { filter } 규약을 따르며 UI에서 교체된다.
   정렬은 항상 힙(MaxHeap.heapsort)이 담당하므로 comparator는 두지 않는다.
   ========================================================================= */

import type { ScoredTask } from '../types';

export interface EnergyStrategy {
  key: string;
  label: string;
  hint: string;
  filter: (t: ScoredTask) => boolean;
}

export const ENERGY_STRATEGIES: EnergyStrategy[] = [
  {
    key: 'all',
    label: '전체',
    hint: '모든 할 일을 우선순위 순으로',
    filter: () => true,
  },
  {
    key: 'high',
    label: '몰입 모드',
    hint: '깊은 집중이 필요한 일만',
    filter: (t) => t.energyLevel === 'high',
  },
  {
    key: 'low',
    label: '저전력 모드',
    hint: '가볍게 처리 가능한 일만',
    filter: (t) => t.energyLevel === 'low',
  },
];

export function getEnergyStrategy(key: string): EnergyStrategy {
  return ENERGY_STRATEGIES.find((s) => s.key === key) ?? ENERGY_STRATEGIES[0];
}
