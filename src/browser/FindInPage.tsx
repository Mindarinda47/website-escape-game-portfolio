import { useEffect, useMemo, useRef, useState } from "react";
import { useGameState } from "../state/GameStateContext";
import type { PageId } from "../state/types";

const pageIndex: Record<PageId, string[]> = {
  portal: ["오늘", "뉴스", "쇼핑", "스포츠", "게임", "추천"],
  news: ["오늘", "산림", "불길", "새벽", "관련 기사", "기록"],
  shop: ["라스트", "생수", "카드", "무료 샘플", "재고"],
  sports: ["오늘", "예측", "홈", "무승부", "원정", "경기"],
  "ad-game": ["key", "adventure", "조작법", "G의 전설", "열쇠", "구출", "용사"],
};

type Props = { page: PageId; onClose: () => void };

export function FindInPage({ page, onClose }: Props) {
  const { dispatch } = useGameState();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const matches = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    if (page === "shop" && normalized === "라스트") return ["라스트"];
    return pageIndex[page].filter((entry) => entry.toLowerCase().includes(normalized));
  }, [page, query]);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => setIndex(0), [query, page]);
  useEffect(() => {
    if (page === "shop" && query === "라스트") dispatch({ type: "REVEAL_HIDDEN_STOCK" });
  }, [dispatch, page, query]);

  function move(delta: number) {
    if (!matches.length) return;
    const next = (index + delta + matches.length) % matches.length;
    setIndex(next);
  }

  return (
    <div className="find-panel" role="search" onKeyDown={(event) => { if (event.key === "Escape") onClose(); }}>
      <input
        ref={inputRef}
        aria-label="페이지에서 찾기"
        placeholder="페이지에서 찾기"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => { if (event.key === "Enter") move(event.shiftKey ? -1 : 1); }}
      />
      <span aria-live="polite">{matches.length ? `${index + 1}/${matches.length}` : "0/0"}</span>
      <button aria-label="이전 검색 결과" onClick={() => move(-1)}>↑</button>
      <button aria-label="다음 검색 결과" onClick={() => move(1)}>↓</button>
      <button aria-label="찾기 닫기" onClick={onClose}>×</button>
    </div>
  );
}
