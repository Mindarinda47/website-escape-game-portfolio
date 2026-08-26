import { describe, expect, it } from "vitest";
import { bgmForAdventure } from "../BGM/bgm";

describe("adventure BGM routing", () => {
  it("keeps one theme across connected scene groups", () => {
    expect(bgmForAdventure(true, "village", false)).toBe("beforeAdventure");
    expect(bgmForAdventure(true, "world", false)).toBe("beforeAdventure");
    expect(bgmForAdventure(true, "dungeon", false)).toBe("dangerousPlace");
    expect(bgmForAdventure(true, "castle-1", false)).toBe("dangerousPlace");
    expect(bgmForAdventure(true, "castle-2", false)).toBe("dangerousPlace");
    expect(bgmForAdventure(true, "secret", false)).toBe("hidden");
    expect(bgmForAdventure(true, "rescue", false)).toBe("hidden");
  });

  it("uses the main theme before unlocking and keeps the boss room silent until the cutscene ends", () => {
    expect(bgmForAdventure(false, "village", false)).toBe("mainTheme");
    expect(bgmForAdventure(true, "boss", false)).toBeNull();
    expect(bgmForAdventure(true, "boss", true)).toBeNull();
    expect(bgmForAdventure(true, "clear", true)).toBeNull();
  });
});
