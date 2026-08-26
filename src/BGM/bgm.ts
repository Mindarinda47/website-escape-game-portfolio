import beforeAdventureSource from "./before_adventure.mp3";
import dangerousPlaceSource from "./dangerous_place.mp3";
import finalBattleSource from "./final_battle.mp3";
import hiddenSource from "./hidden.mp3";
import mainThemeSource from "./Legend_of_G_main_theme.mp3";
import type { Checkpoint } from "../state/types";

export type BgmId = "mainTheme" | "beforeAdventure" | "dangerousPlace" | "finalBattle" | "hidden";

const BGM_MASTER_VOLUME = 0.78;
const DEFAULT_FADE_DURATION = 900;

const bgmConfig: Record<BgmId, { source: string; volume: number }> = {
  mainTheme: { source: mainThemeSource, volume: 0.28 },
  beforeAdventure: { source: beforeAdventureSource, volume: 0.25 },
  dangerousPlace: { source: dangerousPlaceSource, volume: 0.23 },
  finalBattle: { source: finalBattleSource, volume: 0.27 },
  hidden: { source: hiddenSource, volume: 0.24 },
};

let activeBgm: { id: BgmId; audio: HTMLAudioElement } | null = null;
let desiredBgm: BgmId | null = null;
const fadeFrames = new Map<HTMLAudioElement, number>();
let unlockListenerAttached = false;

export function bgmForAdventure(keyUsed: boolean, checkpoint: Checkpoint, bossDefeated: boolean): BgmId | null {
  if (!keyUsed) return "mainTheme";
  if (bossDefeated && (checkpoint === "boss" || checkpoint === "clear")) return null;
  if (checkpoint === "village" || checkpoint === "world") return "beforeAdventure";
  if (checkpoint === "dungeon" || checkpoint === "castle-1" || checkpoint === "castle-2") return "dangerousPlace";
  if (checkpoint === "boss") return null;
  if (checkpoint === "secret" || checkpoint === "rescue") return "hidden";
  return null;
}

function targetVolume(id: BgmId): number {
  return BGM_MASTER_VOLUME * bgmConfig[id].volume;
}

function fadeAudio(audio: HTMLAudioElement, volume: number, duration: number, stopAfterFade = false): void {
  const previousFrame = fadeFrames.get(audio);
  if (previousFrame !== undefined) cancelAnimationFrame(previousFrame);
  const startedAt = performance.now();
  const initialVolume = audio.volume;

  const update = (time: number) => {
    const progress = duration <= 0 ? 1 : Math.min(1, (time - startedAt) / duration);
    audio.volume = initialVolume + (volume - initialVolume) * (1 - Math.pow(1 - progress, 3));
    if (progress < 1) {
      fadeFrames.set(audio, requestAnimationFrame(update));
      return;
    }
    fadeFrames.delete(audio);
    if (stopAfterFade) {
      audio.pause();
      audio.currentTime = 0;
    }
  };

  fadeFrames.set(audio, requestAnimationFrame(update));
}

function removeUnlockListeners(): void {
  if (!unlockListenerAttached) return;
  window.removeEventListener("pointerdown", resumeBgmAfterInteraction);
  window.removeEventListener("keydown", resumeBgmAfterInteraction);
  unlockListenerAttached = false;
}

function attachUnlockListeners(): void {
  if (unlockListenerAttached) return;
  unlockListenerAttached = true;
  window.addEventListener("pointerdown", resumeBgmAfterInteraction);
  window.addEventListener("keydown", resumeBgmAfterInteraction);
}

function resumeBgmAfterInteraction(): void {
  removeUnlockListeners();
  const current = activeBgm;
  if (!current || current.id !== desiredBgm) return;
  void current.audio.play().then(() => {
    if (activeBgm?.audio !== current.audio || desiredBgm !== current.id) return;
    fadeAudio(current.audio, targetVolume(current.id), 450);
  }).catch(attachUnlockListeners);
}

export function setBgm(id: BgmId | null, fadeDuration = DEFAULT_FADE_DURATION): void {
  desiredBgm = id;
  if (!id) {
    stopBgm(fadeDuration);
    return;
  }
  if (activeBgm?.id === id) {
    if (activeBgm.audio.paused) void activeBgm.audio.play().catch(attachUnlockListeners);
    return;
  }

  const previous = activeBgm;
  const audio = new Audio(bgmConfig[id].source);
  audio.loop = true;
  audio.preload = "auto";
  audio.volume = 0;
  activeBgm = { id, audio };

  if (previous) fadeAudio(previous.audio, 0, fadeDuration, true);
  void audio.play().then(() => {
    if (activeBgm?.audio !== audio || desiredBgm !== id) return;
    removeUnlockListeners();
    fadeAudio(audio, targetVolume(id), fadeDuration);
  }).catch(attachUnlockListeners);
}

export function stopBgm(fadeDuration = DEFAULT_FADE_DURATION): void {
  desiredBgm = null;
  removeUnlockListeners();
  if (!activeBgm) return;
  const previous = activeBgm.audio;
  activeBgm = null;
  fadeAudio(previous, 0, fadeDuration, true);
}
