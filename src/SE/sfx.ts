import amazingSwordHitSource from "./amazing_sword_hit.wav";
import amazingSwordSwingSource from "./amazing_sword_swing.wav";
import dragonBossDefeatedExplosionSource from "./dragon_boss_defeated_explosion.wav";
import dragonBossRoarSource from "./dragon_boss_roar.wav";
import dragonBreathChargeSource from "./dragon_breath_charge_2s.wav";
import dragonFireBeamSource from "./dragon_fire_beam_3s.wav";
import footstepsDirtSource from "./footsteps_dirt_loop.wav";
import footstepsGrassSource from "./footsteps_grass_loop.wav";
import footstepsStoneSource from "./footsteps_stone_loop.wav";
import gameClearSource from "./game_clear.wav";
import harpItemObtainedSource from "./harp_item_obtained.wav";
import heroHurtSource from "./hero_hurt.wav";
import importantItemObtainedSource from "./important_item_obtained.wav";
import levelUpSource from "./level_up.wav";
import monsterDefeatedSource from "./monster_defeated.wav";
import oldSwordHitSource from "./old_sword_hit.wav";
import oldSwordSwingSource from "./old_sword_swing.wav";
import skullFireAttackSource from "./skull_fire_attack.wav";
import treasureChestOpenSource from "./treasure_chest_open.wav";
import vampireBatSqueakSource from "./vampire_bat_squeak.wav";
import wellHealSource from "./well_heal.wav";
import fireExtinguishSource from "./web-sfx-cc0-v3/fire_extinguish.wav";
import footballBallContactSource from "./web-sfx-cc0-v3/football_ball_contact.wav";
import footballWhistleSource from "./web-sfx-cc0-v3/football_match_start_whistle.wav";

export type SfxId =
  | "oldSwordSwing" | "oldSwordHit" | "amazingSwordSwing" | "amazingSwordHit"
  | "footstepsGrass" | "footstepsDirt" | "footstepsStone"
  | "vampireBatSqueak" | "skullFireAttack"
  | "dragonBossRoar" | "dragonBreathCharge" | "dragonFireBeam"
  | "dragonBossDefeatedExplosion" | "harpItemObtained" | "heroHurt"
  | "importantItemObtained" | "monsterDefeated" | "treasureChestOpen" | "wellHeal"
  | "fireExtinguish" | "footballBallContact" | "footballWhistle"
  | "levelUp" | "gameClear";

export type FootstepSurface = "grass" | "dirt" | "stone";

const MASTER_VOLUME = 0.72;
const MAX_EFFECT_VOICES = 4;

const soundConfig: Record<SfxId, { source: string; volume: number }> = {
  oldSwordSwing: { source: oldSwordSwingSource, volume: 0.34 },
  oldSwordHit: { source: oldSwordHitSource, volume: 0.4 },
  amazingSwordSwing: { source: amazingSwordSwingSource, volume: 0.38 },
  amazingSwordHit: { source: amazingSwordHitSource, volume: 0.44 },
  footstepsGrass: { source: footstepsGrassSource, volume: 0.22 },
  footstepsDirt: { source: footstepsDirtSource, volume: 0.2 },
  footstepsStone: { source: footstepsStoneSource, volume: 0.28 },
  vampireBatSqueak: { source: vampireBatSqueakSource, volume: 0.3 },
  skullFireAttack: { source: skullFireAttackSource, volume: 0.32 },
  dragonBossRoar: { source: dragonBossRoarSource, volume: 0.42 },
  dragonBreathCharge: { source: dragonBreathChargeSource, volume: 0.34 },
  dragonFireBeam: { source: dragonFireBeamSource, volume: 0.4 },
  dragonBossDefeatedExplosion: { source: dragonBossDefeatedExplosionSource, volume: 0.46 },
  harpItemObtained: { source: harpItemObtainedSource, volume: 0.38 },
  heroHurt: { source: heroHurtSource, volume: 0.4 },
  importantItemObtained: { source: importantItemObtainedSource, volume: 0.38 },
  monsterDefeated: { source: monsterDefeatedSource, volume: 0.34 },
  treasureChestOpen: { source: treasureChestOpenSource, volume: 0.34 },
  wellHeal: { source: wellHealSource, volume: 0.32 },
  fireExtinguish: { source: fireExtinguishSource, volume: 0.34 },
  footballBallContact: { source: footballBallContactSource, volume: 0.18 },
  footballWhistle: { source: footballWhistleSource, volume: 0.36 },
  levelUp: { source: levelUpSource, volume: 0.38 },
  gameClear: { source: gameClearSource, volume: 0.42 },
};

const effectPools = new Map<SfxId, HTMLAudioElement[]>();
let activeFootsteps: { id: SfxId; audio: HTMLAudioElement } | null = null;

function createAudio(id: SfxId): HTMLAudioElement {
  const audio = new Audio(soundConfig[id].source);
  audio.preload = "auto";
  audio.volume = MASTER_VOLUME * soundConfig[id].volume;
  return audio;
}

export function playSfx(id: SfxId): void {
  const pool = effectPools.get(id) ?? [];
  let audio = pool.find((candidate) => candidate.paused || candidate.ended);
  if (!audio) {
    audio = pool.length < MAX_EFFECT_VOICES ? createAudio(id) : pool[0];
    if (pool.length < MAX_EFFECT_VOICES) {
      pool.push(audio);
      effectPools.set(id, pool);
    }
  }
  audio.pause();
  audio.currentTime = 0;
  audio.volume = MASTER_VOLUME * soundConfig[id].volume;
  void audio.play().catch(() => undefined);
}

export function stopSfx(id: SfxId): void {
  effectPools.get(id)?.forEach((audio) => {
    audio.pause();
    audio.currentTime = 0;
  });
}

export function setFootsteps(surface: FootstepSurface | null): void {
  const nextId: SfxId | null = surface === "grass"
    ? "footstepsGrass"
    : surface === "dirt"
      ? "footstepsDirt"
      : surface === "stone"
        ? "footstepsStone"
        : null;
  if (activeFootsteps?.id === nextId && !activeFootsteps.audio.paused) return;
  if (activeFootsteps) {
    activeFootsteps.audio.pause();
    activeFootsteps.audio.currentTime = 0;
    activeFootsteps = null;
  }
  if (!nextId) return;
  const audio = createAudio(nextId);
  audio.loop = true;
  activeFootsteps = { id: nextId, audio };
  void audio.play().catch(() => {
    if (activeFootsteps?.audio === audio) activeFootsteps = null;
  });
}

export function stopAdventureSfx(): void {
  setFootsteps(null);
  stopSfx("dragonBossRoar");
  stopSfx("dragonBreathCharge");
  stopSfx("dragonFireBeam");
  stopSfx("dragonBossDefeatedExplosion");
}
