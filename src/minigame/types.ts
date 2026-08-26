import type { Checkpoint } from "../state/types";

export type Vec2 = { x: number; y: number };
export type Rect = Vec2 & { width: number; height: number };
export type Direction = "down" | "left" | "right" | "up";
export type EnemyKind = "melee" | "ranged" | "boss";
export type BossSkillPhase = "idle" | "charging" | "breathing";
export type MeleeAttackPhase = "moving" | "telegraph" | "dashing";
export type BossIntroPhase = "inactive" | "approach" | "dialogue" | "battle";

export type Actor = Vec2 & { radius: number; hp: number; maxHp: number };
export type PlayerActor = Actor & { direction: Direction; moving: boolean; walkTime: number; knockbackVelocity: Vec2; knockbackTimer: number };
export type EnemyActor = Actor & {
  id: string;
  kind: EnemyKind;
  cooldown: number;
  patternTime: number;
  phase: number;
  specialPhase: BossSkillPhase;
  specialTimer: number;
  specialCooldown: number;
  specialAngle: number;
  knockbackVelocity: Vec2;
  knockbackTimer: number;
  hitFlashTimer: number;
  meleePhase: MeleeAttackPhase;
  meleeTimer: number;
  meleeDashVelocity: Vec2;
};
export type DefeatEffect = { enemy: EnemyActor; timer: number; duration: number };
export type Projectile = Vec2 & { vx: number; vy: number; radius: number; life: number; hostile: boolean };

export type AdventureRuntime = {
  scene: Checkpoint;
  player: PlayerActor;
  enemies: EnemyActor[];
  defeatEffects: DefeatEffect[];
  projectiles: Projectile[];
  attackTimer: number;
  attackCooldown: number;
  invulnerableUntil: number;
  elapsed: number;
  respawnTimer: number;
  bossDefeatTimer: number;
  bossDefeatPosition: Vec2 | null;
  bossPassageOpen: boolean;
  bossIntroPhase: BossIntroPhase;
  bossDialogueIndex: number;
};

export type SceneExit = {
  rect: Rect;
  to: Checkpoint;
  spawn: Vec2;
  label: string;
  hidden?: boolean;
  requiresLevel?: number;
  requiresGreatSword?: boolean;
  requiresBossDefeated?: boolean;
};

export type SceneDefinition = {
  title: string;
  objective: string;
  ground: "village" | "grass" | "dungeon" | "castle" | "secret" | "rescue";
  width: number;
  height: number;
  spawn: Vec2;
  obstacles: Rect[];
  exits: SceneExit[];
};
