import { initialState } from "../state/initialState";
import { loadGameState, saveGameState, STORAGE_KEY } from "../state/persistence";

describe("state persistence", () => {
  it("saves progress but clears the transient selected item", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
    };
    saveGameState({ ...initialState, inventory: { ...initialState.inventory, water: "owned", selectedItem: "water" } }, storage);
    const loaded = loadGameState(storage);
    expect(loaded.inventory.water).toBe("owned");
    expect(loaded.inventory.selectedItem).toBeNull();
    expect(values.has(STORAGE_KEY)).toBe(true);
  });

  it("recovers safely from corrupted data", () => {
    expect(loadGameState({ getItem: () => "{broken" })).toEqual(initialState);
    expect(loadGameState({ getItem: () => JSON.stringify({ version: 99 }) })).toEqual(initialState);
  });

  it("moves legacy minigame checkpoints back to the new village", () => {
    const loaded = loadGameState({ getItem: () => JSON.stringify({ version: 1, adGame: { checkpoint: "start", level: 4 } }) });
    expect(loaded.adGame.checkpoint).toBe("village");
    expect(loaded.adGame.level).toBe(4);
  });

  it("keeps collected hints and supplies defaults for older saves", () => {
    const collected = loadGameState({ getItem: () => JSON.stringify({ version: 1, collectedHints: { "shop-last": true } }) });
    expect(collected.collectedHints).toEqual({ "shop-last": true, "news-night": false });

    const legacy = loadGameState({ getItem: () => JSON.stringify({ version: 1 }) });
    expect(legacy.collectedHints).toEqual(initialState.collectedHints);
    expect(legacy.letterOrder).toEqual(initialState.letterOrder);
  });
});
