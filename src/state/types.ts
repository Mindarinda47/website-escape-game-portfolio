export type PageId = "portal" | "news" | "shop" | "sports" | "ad-game";
export type ContentPageId = Exclude<PageId, "portal">;
export type LetterClueId =
  | "shop-t"
  | "shop-l"
  | "news-o"
  | "sports-o"
  | "game-g"
  | "game-u";
export type ItemId = "water" | "key";
export type HintId = "shop-last" | "news-night";
export type ItemState = "missing" | "owned" | "used";
export type ZoomPercent = 75 | 100 | 125 | 150;
export type Checkpoint = "village" | "world" | "dungeon" | "castle-1" | "castle-2" | "boss" | "secret" | "rescue" | "clear";

export type GameState = {
  version: 1;
  currentPage: PageId;
  virtualHistory: PageId[];
  historyIndex: number;
  visitedPages: Record<ContentPageId, boolean>;
  collectedLetters: Record<LetterClueId, boolean>;
  letterOrder: LetterClueId[];
  collectedHints: Record<HintId, boolean>;
  inventory: {
    water: ItemState;
    key: ItemState;
    points: number;
    selectedItem: ItemId | null;
  };
  shop: {
    waterCollected: boolean;
    cardDetailOpened: boolean;
    hiddenStockRevealed: boolean;
  };
  news: { fireExtinguished: boolean };
  sports: {
    prediction: "home" | "draw" | "away" | null;
    simulationCompleted: boolean;
    predictionWasCorrect: boolean | null;
    rewardGranted: boolean;
    attempts: number;
    homeScore: number;
    awayScore: number;
    specialAddressUnlocked: boolean;
  };
  adGame: {
    keyUsed: boolean;
    checkpoint: Checkpoint;
    bossDefeated: boolean;
    princessRescued: boolean;
    level: number;
    exp: number;
    gold: number;
    hp: number;
    maxHp: number;
    greatSwordPurchased: boolean;
  };
  browser: {
    darkMode: boolean;
    zoomPercent: ZoomPercent;
    inventoryPinned: boolean;
  };
  endingSeen: boolean;
};

export type GameAction =
  | { type: "NAVIGATE"; page: PageId }
  | { type: "HISTORY_BACK" }
  | { type: "HISTORY_FORWARD" }
  | { type: "SET_DARK_MODE"; value: boolean }
  | { type: "SET_ZOOM"; value: ZoomPercent }
  | { type: "SET_INVENTORY_PINNED"; value: boolean }
  | { type: "SELECT_ITEM"; item: ItemId | null }
  | { type: "COLLECT_WATER" }
  | { type: "BUY_KEY" }
  | { type: "OPEN_CARD_DETAIL" }
  | { type: "REVEAL_HIDDEN_STOCK" }
  | { type: "COLLECT_LETTER"; clue: LetterClueId }
  | { type: "REORDER_LETTERS"; order: LetterClueId[] }
  | { type: "COLLECT_HINT"; hint: HintId }
  | { type: "EXTINGUISH_FIRE" }
  | { type: "START_MATCH"; prediction: "home" | "draw" | "away" }
  | { type: "FINISH_MATCH"; outcome: "home" | "draw" | "away"; homeScore: number; awayScore: number }
  | { type: "RETRY_MATCH" }
  | { type: "USE_KEY" }
  | { type: "SET_CHECKPOINT"; checkpoint: Checkpoint }
  | { type: "GAIN_ADVENTURE_REWARD"; exp: number; gold: number }
  | { type: "SET_ADVENTURE_HP"; hp: number }
  | { type: "REST_ADVENTURE" }
  | { type: "BUY_GREAT_SWORD" }
  | { type: "SPEND_ADVENTURE_GOLD"; amount: number }
  | { type: "DEFEAT_BOSS" }
  | { type: "RESCUE_PRINCESS" }
  | { type: "REPLAY_ADVENTURE" }
  | { type: "MARK_ENDING_SEEN" }
  | { type: "RESET_GAME" };
