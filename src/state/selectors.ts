import type { ContentPageId, GameState, HintId, LetterClueId, PageId } from "./types";

export const letterValues: Record<LetterClueId, string> = {
  "shop-t": "T",
  "shop-l": "L",
  "news-o": "O",
  "sports-o": "O",
  "game-g": "G",
  "game-u": "U",
};

export const pageLetters: Record<ContentPageId, LetterClueId[]> = {
  shop: ["shop-t", "shop-l"],
  news: ["news-o"],
  sports: ["sports-o"],
  "ad-game": ["game-g", "game-u"],
};

export const pageTitles: Record<PageId, string> = {
  portal: "GOGLE",
  news: "새벽일보",
  shop: "GOGLE SHOP",
  sports: "하프타임 스포츠",
  "ad-game": "G의 전설",
};

export const pageAddresses: Record<PageId, string> = {
  portal: "gogle.com",
  news: "gogle.com/news/today",
  shop: "gogle.com/shop",
  sports: "gogle.com/sports",
  "ad-game": "gogle.com/ads/hero",
};

export function selectPageCompleted(state: GameState, page: ContentPageId): boolean {
  if (page === "shop") {
    return state.inventory.water !== "missing" && state.inventory.key !== "missing" && state.collectedLetters["shop-t"] && state.collectedLetters["shop-l"];
  }
  if (page === "news") return state.news.fireExtinguished && state.collectedLetters["news-o"];
  if (page === "sports") {
    return state.sports.simulationCompleted && state.sports.rewardGranted && state.collectedLetters["sports-o"];
  }
  return state.adGame.keyUsed && state.adGame.bossDefeated && state.adGame.princessRescued && state.collectedLetters["game-g"] && state.collectedLetters["game-u"];
}

export function selectPageProgress(state: GameState, page: ContentPageId): [number, number] {
  const clues = pageLetters[page];
  return [clues.filter((clue) => state.collectedLetters[clue]).length, clues.length];
}

export function selectCollectedLetters(state: GameState): LetterClueId[] {
  return state.letterOrder.filter((clue) => state.collectedLetters[clue]);
}

export function selectCollectedHints(state: GameState): HintId[] {
  const displayOrder: HintId[] = ["shop-last", "news-night"];
  return displayOrder.filter((hint) => state.collectedHints[hint]);
}

export function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase().replaceAll(" ", "").replace(/^\//, "");
}

export function isEndingAnswer(value: string): boolean {
  const normalized = normalizeAnswer(value);
  return normalized === "logout" || normalized === "로그아웃";
}
