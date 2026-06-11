import { Icon } from './icons';

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export function SearchBar({ value, onChange }: Props) {
  return (
    <div className="searchbar">
      {Icon.search}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="할 일 검색 — 제목으로 필터링"
        aria-label="할 일 검색"
      />
      {value && (
        <button className="clr" onClick={() => onChange('')} title="지우기" aria-label="검색어 지우기">
          {Icon.x}
        </button>
      )}
    </div>
  );
}
