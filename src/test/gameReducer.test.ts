import { gameReducer } from "../state/gameReducer";
import { initialState } from "../state/initialState";
import { selectPageCompleted } from "../state/selectors";
import type { GameAction, GameState } from "../state/types";

function reduce(actions: GameAction[], start: GameState = initialState): GameState {
  return actions.reduce(gameReducer, start);
}

describe("game reducer", () => {
  it("keeps puzzle state while navigating virtual history", () => {
    const state = reduce([
      { type: "COLLECT_WATER" },
      { type: "NAVIGATE", page: "news" },
      { type: "NAVIGATE", page: "sports" },
      { type: "HISTORY_BACK" },
    ]);
    expect(state.currentPage).toBe("news");
    expect(state.inventory.water).toBe("owned");
    expect(state.visitedPages.news).toBe(true);
    expect(state.visitedPages.sports).toBe(true);
  });

  it("supports the shop-news branch even when news is visited first", () => {
    const state = reduce([
      { type: "NAVIGATE", page: "news" },
      { type: "EXTINGUISH_FIRE" },
      { type: "NAVIGATE", page: "shop" },
      { type: "COLLECT_WATER" },
      { type: "COLLECT_LETTER", clue: "shop-t" },
      { type: "COLLECT_LETTER", clue: "shop-l" },
      { type: "START_MATCH", prediction: "home" },
      { type: "FINISH_MATCH", outcome: "home", homeScore: 2, awayScore: 1 },
      { type: "BUY_KEY" },
      { type: "NAVIGATE", page: "news" },
      { type: "SELECT_ITEM", item: "water" },
      { type: "EXTINGUISH_FIRE" },
      { type: "COLLECT_LETTER", clue: "news-o" },
    ]);
    expect(selectPageCompleted(state, "shop")).toBe(true);
    expect(selectPageCompleted(state, "news")).toBe(true);
    expect(state.inventory.water).toBe("used");
  });

  it("only grants points for a correct retry and spends them on the game key", () => {
    const failedState = reduce([
      { type: "START_MATCH", prediction: "away" },
      { type: "FINISH_MATCH", outcome: "home", homeScore: 2, awayScore: 1 },
    ]);
    expect(failedState.sports.predictionWasCorrect).toBe(false);
    expect(failedState.sports.rewardGranted).toBe(false);
    expect(failedState.sports.attempts).toBe(1);
    expect(failedState.inventory.points).toBe(0);

    const rewardedState = reduce([
      { type: "RETRY_MATCH" },
      { type: "START_MATCH", prediction: "home" },
      { type: "FINISH_MATCH", outcome: "home", homeScore: 2, awayScore: 1 },
      { type: "COLLECT_LETTER", clue: "sports-o" },
    ], failedState);
    expect(rewardedState.inventory.points).toBe(50000);

    const state = reduce([
      { type: "BUY_KEY" },
      { type: "SELECT_ITEM", item: "key" },
      { type: "USE_KEY" },
      { type: "COLLECT_LETTER", clue: "game-u" },
      { type: "DEFEAT_BOSS" },
      { type: "COLLECT_LETTER", clue: "game-g" },
      { type: "RESCUE_PRINCESS" },
    ], rewardedState);
    expect(state.sports.predictionWasCorrect).toBe(true);
    expect(state.sports.rewardGranted).toBe(true);
    expect(state.sports.attempts).toBe(2);
    expect(state.inventory.points).toBe(0);
    expect(state.inventory.key).toBe("used");
    expect(selectPageCompleted(state, "sports")).toBe(true);
    expect(selectPageCompleted(state, "ad-game")).toBe(true);
  });

  it("levels the hero and buys the great sword with dungeon gold", () => {
    const state = reduce([
      { type: "GAIN_ADVENTURE_REWARD", exp: 30, gold: 45 },
      { type: "BUY_GREAT_SWORD" },
    ]);
    expect(state.adGame.level).toBe(2);
    expect(state.adGame.exp).toBe(0);
    expect(state.adGame.maxHp).toBe(7);
    expect(state.adGame.hp).toBe(7);
    expect(state.adGame.gold).toBe(0);
    expect(state.adGame.greatSwordPurchased).toBe(true);
  });

  it("stores treasure hints permanently without duplicating them", () => {
    const state = reduce([
      { type: "COLLECT_HINT", hint: "shop-last" },
      { type: "COLLECT_HINT", hint: "shop-last" },
      { type: "COLLECT_HINT", hint: "news-night" },
    ]);
    expect(state.collectedHints).toEqual({ "shop-last": true, "news-night": true });
  });

  it("reorders all six letter slots and charges fortune hints each time", () => {
    const reordered = ["shop-l", "sports-o", "game-g", "news-o", "game-u", "shop-t"] as const;
    const state = reduce([
      { type: "REORDER_LETTERS", order: [...reordered] },
      { type: "GAIN_ADVENTURE_REWARD", exp: 0, gold: 30 },
      { type: "SPEND_ADVENTURE_GOLD", amount: 15 },
      { type: "SPEND_ADVENTURE_GOLD", amount: 15 },
      { type: "SPEND_ADVENTURE_GOLD", amount: 15 },
    ]);
    expect(state.letterOrder).toEqual(reordered);
    expect(state.adGame.gold).toBe(0);
  });
});
