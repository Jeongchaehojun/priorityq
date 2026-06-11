import { useEffect, useState } from 'react';
import type { Task } from '../types';
import { seed } from '../data/seed';

const STORAGE_KEY = 'pq_v2';

/**
 * 할 일 상태 + 영속화 + CRUD 를 캡슐화한 훅.
 * standalone 환경에서는 localStorage 에 저장하고, 접근 불가 시 in-memory 로 동작.
 */
export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loaded, setLoaded] = useState(false);

  // 최초 1회: 저장된 데이터 로드, 없으면 시드
  useEffect(() => {
    let init: Task[] | null = null;
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s) init = JSON.parse(s) as Task[];
    } catch {
      /* localStorage 접근 불가 → 시드로 진행 */
    }
    setTasks(init ?? seed());
    setLoaded(true);
  }, []);

  // 변경 시마다 저장
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch {
      /* 저장 실패는 무시 (in-memory fallback) */
    }
  }, [tasks, loaded]);

  const add = (t: Task) => setTasks((p) => [...p, t]);
  const update = (id: string, patch: Partial<Task>) =>
    setTasks((p) => p.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const toggle = (id: string) =>
    setTasks((p) =>
      p.map((t) => {
        if (t.id !== id) return t;
        const done = !t.done;
        // 완료로 바꾸면 그 시각을 기록(캘린더 집계), 되돌리면 비운다
        return { ...t, done, completedAt: done ? new Date().toISOString() : null };
      }),
    );
  const remove = (id: string) => setTasks((p) => p.filter((t) => t.id !== id));
  /** 시연용 예시 데이터로 되돌린다 (라이브 데모 중 사고 복구용) */
  const reset = () => setTasks(seed());

  return { tasks, loaded, add, update, toggle, remove, reset };
}
