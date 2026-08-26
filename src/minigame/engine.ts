import { scenes } from "./scenes";
import type { Actor, AdventureRuntime, Direction, EnemyActor, EnemyKind, Rect, Vec2 } from "./types";

export const CANVAS_WIDTH = 768;
export const CANVAS_HEIGHT = 480;
export const PLAYER_MOVE_SPEED = 180;
export const RUN_SPEED_MULTIPLIER = 1.65;
export const BASIC_SWORD_RANGE = 70;
export const GREAT_SWORD_RANGE = 104;
export const BASIC_SWORD_HALF_ANGLE = Math.PI * (48 / 180);
export const GREAT_SWORD_HALF_ANGLE = Math.PI * (66 / 180);
export const BOSS_FIRE_CHARGE_DURATION = 2;
export const BOSS_FIRE_AIM_LOCK_DURATION = 0.45;
export const BOSS_FIRE_DURATION = 3;
export const BOSS_FIRE_LENGTH = 520;
export const BOSS_FIRE_WIDTH = 56;
export const BOSS_DEFEAT_DURATION = 3.2;

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function directionVector(direction: Direction): Vec2 {
  if (direction === "left") return { x: -1, y: 0 };
  if (direction === "right") return { x: 1, y: 0 };
  if (direction === "up") return { x: 0, y: -1 };
  return { x: 0, y: 1 };
}

function enemy(id: string, kind: EnemyKind, x: number, y: number): EnemyActor {
  const maxHp = kind === "boss" ? 60 : 3;
  return {
    id, kind, x, y, radius: kind === "boss" ? 42 : 16, hp: maxHp, maxHp, cooldown: 0.5,
    patternTime: 0, phase: Math.random() * Math.PI * 2, specialPhase: "idle", specialTimer: 0,
    specialCooldown: kind === "boss" ? 4 : 0, specialAngle: 0, knockbackVelocity: { x: 0, y: 0 }, knockbackTimer: 0, hitFlashTimer: 0,
    meleePhase: "moving", meleeTimer: 0, meleeDashVelocity: { x: 0, y: 0 },
  };
}

export function createEnemies(scene: AdventureRuntime["scene"]): EnemyActor[] {
  if (scene === "dungeon") {
    return [
      enemy("blade-1", "melee", 185, 620), enemy("blade-2", "melee", 650, 330), enemy("blade-3", "melee", 930, 850),
      enemy("blade-4", "melee", 1450, 620), enemy("blade-5", "melee", 1780, 1120), enemy("blade-6", "melee", 650, 1210),
      enemy("wisp-1", "ranged", 390, 860), enemy("wisp-2", "ranged", 1190, 300), enemy("wisp-3", "ranged", 1680, 860),
      enemy("wisp-4", "ranged", 1350, 1420),
    ];
  }
  if (scene === "castle-1") {
    return [enemy("guard-1", "melee", 300, 470), enemy("guard-2", "melee", 1180, 430), enemy("seer-1", "ranged", 750, 650)];
  }
  if (scene === "castle-2") {
    return [enemy("guard-3", "melee", 330, 700), enemy("guard-4", "melee", 1170, 700), enemy("seer-2", "ranged", 350, 250), enemy("seer-3", "ranged", 1150, 250)];
  }
  if (scene === "boss") return [enemy("morgas", "boss", 650, 230)];
  return [];
}

export function createRuntime(scene: AdventureRuntime["scene"], hp = 6, maxHp = 6, spawn = scenes[scene].spawn): AdventureRuntime {
  const safeSpawn = resolveSafeSpawn(scene, spawn, 14);
  return {
    scene,
    player: { ...safeSpawn, radius: 14, hp, maxHp, direction: "down", moving: false, walkTime: 0, knockbackVelocity: { x: 0, y: 0 }, knockbackTimer: 0 },
    enemies: createEnemies(scene),
    defeatEffects: [],
    projectiles: [],
    attackTimer: 0,
    attackCooldown: 0,
    invulnerableUntil: 0,
    elapsed: 0,
    respawnTimer: 0,
    bossDefeatTimer: 0,
    bossDefeatPosition: null,
    bossPassageOpen: false,
    bossIntroPhase: scene === "boss" ? "approach" : "inactive",
    bossDialogueIndex: 0,
  };
}

function circleHitsRect(x: number, y: number, radius: number, rect: Rect): boolean {
  const nearestX = clamp(x, rect.x, rect.x + rect.width);
  const nearestY = clamp(y, rect.y, rect.y + rect.height);
  return Math.hypot(x - nearestX, y - nearestY) < radius;
}

function canOccupy(actor: Pick<Actor, "radius">, x: number, y: number, obstacles: Rect[], width: number, height: number): boolean {
  if (x < actor.radius || x > width - actor.radius || y < actor.radius || y > height - actor.radius) return false;
  return !obstacles.some((rect) => circleHitsRect(x, y, actor.radius, rect));
}

export function resolveSafeSpawn(scene: AdventureRuntime["scene"], spawn: Vec2, radius: number): Vec2 {
  const definition = scenes[scene];
  const actor = { radius };
  if (canOccupy(actor, spawn.x, spawn.y, definition.obstacles, definition.width, definition.height)) return { ...spawn };
  for (let range = 16; range <= 192; range += 16) {
    for (let y = -range; y <= range; y += 16) {
      for (let x = -range; x <= range; x += 16) {
        if (Math.max(Math.abs(x), Math.abs(y)) !== range) continue;
        const candidate = { x: spawn.x + x, y: spawn.y + y };
        if (canOccupy(actor, candidate.x, candidate.y, definition.obstacles, definition.width, definition.height)) return candidate;
      }
    }
  }
  return { ...definition.spawn };
}

function moveActor(actor: Actor, dx: number, dy: number, obstacles: Rect[], width: number, height: number): void {
  resolveActorOverlap(actor, obstacles, width, height);
  const nextX = actor.x + dx;
  const nextY = actor.y + dy;
  if (canOccupy(actor, nextX, actor.y, obstacles, width, height)) actor.x = nextX;
  if (canOccupy(actor, actor.x, nextY, obstacles, width, height)) actor.y = nextY;
}

function resolveActorOverlap(actor: Actor, obstacles: Rect[], width: number, height: number): void {
  if (canOccupy(actor, actor.x, actor.y, obstacles, width, height)) return;
  for (let range = 4; range <= 96; range += 4) {
    for (let angleIndex = 0; angleIndex < 16; angleIndex += 1) {
      const angle = angleIndex * Math.PI / 8;
      const x = actor.x + Math.cos(angle) * range;
      const y = actor.y + Math.sin(angle) * range;
      if (canOccupy(actor, x, y, obstacles, width, height)) {
        actor.x = x;
        actor.y = y;
        return;
      }
    }
  }
}

function moveEnemyActor(actor: EnemyActor, dx: number, dy: number, obstacles: Rect[], width: number, height: number): void {
  const startX = actor.x;
  const startY = actor.y;
  moveActor(actor, dx, dy, obstacles, width, height);
  if (Math.hypot(actor.x - startX, actor.y - startY) > 0.1) return;
  moveActor(actor, -dy * 0.9, dx * 0.9, obstacles, width, height);
  if (Math.hypot(actor.x - startX, actor.y - startY) > 0.1) return;
  moveActor(actor, dy * 0.9, -dx * 0.9, obstacles, width, height);
}

export function movePlayer(runtime: AdventureRuntime, keys: Set<string>, delta: number, obstacles = scenes[runtime.scene].obstacles, speedMultiplier = 1): void {
  let horizontal = Number(keys.has("arrowright") || keys.has("d")) - Number(keys.has("arrowleft") || keys.has("a"));
  let vertical = Number(keys.has("arrowdown") || keys.has("s")) - Number(keys.has("arrowup") || keys.has("w"));
  if (horizontal !== 0 && vertical !== 0) {
    if (runtime.player.direction === "left" || runtime.player.direction === "right") vertical = 0;
    else horizontal = 0;
  }
  runtime.player.moving = horizontal !== 0 || vertical !== 0;
  if (!runtime.player.moving) return;
  if (horizontal < 0) runtime.player.direction = "left";
  else if (horizontal > 0) runtime.player.direction = "right";
  else if (vertical < 0) runtime.player.direction = "up";
  else runtime.player.direction = "down";
  runtime.player.walkTime += delta * speedMultiplier;
  const scene = scenes[runtime.scene];
  const speed = PLAYER_MOVE_SPEED * speedMultiplier;
  moveActor(runtime.player, horizontal * speed * delta, vertical * speed * delta, obstacles, scene.width, scene.height);
}

function fireAtPlayer(runtime: AdventureRuntime, source: Vec2, speed: number, spread = 0): void {
  const angle = Math.atan2(runtime.player.y - source.y, runtime.player.x - source.x) + spread;
  runtime.projectiles.push({ x: source.x, y: source.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, radius: 7, life: 3, hostile: true });
}

function moveEnemy(enemyActor: EnemyActor, runtime: AdventureRuntime, delta: number, obstacles: Rect[]): void {
  const scene = scenes[runtime.scene];
  const dx = runtime.player.x - enemyActor.x;
  const dy = runtime.player.y - enemyActor.y;
  const gap = Math.hypot(dx, dy) || 1;
  const towardX = dx / gap;
  const towardY = dy / gap;
  const side = Math.sin(enemyActor.patternTime * 1.8 + enemyActor.phase) >= 0 ? 1 : -1;

  if (enemyActor.kind === "melee") {
    if (enemyActor.meleePhase === "telegraph") {
      enemyActor.meleeTimer -= delta;
      if (enemyActor.meleeTimer <= 0) {
        enemyActor.meleePhase = "dashing";
        enemyActor.meleeTimer = 0.42;
      }
      return;
    }
    if (enemyActor.meleePhase === "dashing") {
      moveActor(enemyActor, enemyActor.meleeDashVelocity.x * delta, enemyActor.meleeDashVelocity.y * delta, obstacles, scene.width, scene.height);
      enemyActor.meleeTimer -= delta;
      if (enemyActor.meleeTimer <= 0) {
        enemyActor.meleePhase = "moving";
        enemyActor.meleeTimer = 0;
      }
      return;
    }
    if (!hasClearAttackPath(enemyActor, runtime.player, obstacles)) {
      const patrolAngle = enemyActor.patternTime * 0.75 + enemyActor.phase;
      moveEnemyActor(enemyActor, Math.cos(patrolAngle) * 34 * delta, Math.sin(patrolAngle) * 34 * delta, obstacles, scene.width, scene.height);
      return;
    }
    if (enemyActor.cooldown <= 0 && gap > 70 && gap < 300) {
      enemyActor.meleePhase = "telegraph";
      enemyActor.meleeTimer = 0.55;
      enemyActor.meleeDashVelocity = { x: towardX * 330, y: towardY * 330 };
      enemyActor.cooldown = 2.4;
      return;
    }
    const charging = Math.sin(enemyActor.patternTime * 1.65 + enemyActor.phase) > -0.28;
    const speed = charging && gap < 240 ? 96 : 62;
    const moveX = charging ? towardX : -towardY * side;
    const moveY = charging ? towardY : towardX * side;
    moveEnemyActor(enemyActor, moveX * speed * delta, moveY * speed * delta, obstacles, scene.width, scene.height);
    return;
  }

  if (!hasClearAttackPath(enemyActor, runtime.player, obstacles)) {
    const patrolAngle = enemyActor.patternTime * 0.55 + enemyActor.phase;
    moveEnemyActor(enemyActor, Math.cos(patrolAngle) * 26 * delta, Math.sin(patrolAngle) * 26 * delta, obstacles, scene.width, scene.height);
    return;
  }

  if (enemyActor.kind === "ranged") {
    const desired = gap < 125 ? -1 : gap > 205 ? 1 : 0;
    const moveX = desired === 0 ? -towardY * side : towardX * desired;
    const moveY = desired === 0 ? towardX * side : towardY * desired;
    moveEnemyActor(enemyActor, moveX * 58 * delta, moveY * 58 * delta, obstacles, scene.width, scene.height);
    if (enemyActor.cooldown <= 0 && gap < 310) {
      fireAtPlayer(runtime, enemyActor, 130, (Math.random() - 0.5) * 0.18);
      enemyActor.cooldown = 1.35 + Math.random() * 0.45;
    }
    return;
  }

  if (enemyActor.specialPhase === "charging") {
    if (enemyActor.specialTimer > BOSS_FIRE_AIM_LOCK_DURATION) {
      enemyActor.specialAngle = Math.atan2(runtime.player.y - enemyActor.y, runtime.player.x - enemyActor.x);
    }
    enemyActor.specialTimer -= delta;
    if (enemyActor.specialTimer <= 0) {
      enemyActor.specialPhase = "breathing";
      enemyActor.specialTimer = BOSS_FIRE_DURATION;
    }
    return;
  }
  if (enemyActor.specialPhase === "breathing") {
    enemyActor.specialTimer -= delta;
    if (enemyActor.specialTimer <= 0) {
      enemyActor.specialPhase = "idle";
      enemyActor.specialTimer = 0;
      enemyActor.specialCooldown = 5.5;
    }
    return;
  }
  enemyActor.specialCooldown = Math.max(0, enemyActor.specialCooldown - delta);
  if (enemyActor.specialCooldown <= 0 && gap < 650) {
    enemyActor.specialPhase = "charging";
    enemyActor.specialTimer = BOSS_FIRE_CHARGE_DURATION;
    enemyActor.specialAngle = Math.atan2(dy, dx);
    return;
  }

  const cycle = enemyActor.patternTime % 7;
  if (cycle < 2.4) moveEnemyActor(enemyActor, towardX * 82 * delta, towardY * 82 * delta, obstacles, scene.width, scene.height);
  else if (cycle < 4.3) moveEnemyActor(enemyActor, -towardY * side * 62 * delta, towardX * side * 62 * delta, obstacles, scene.width, scene.height);
  else moveEnemyActor(enemyActor, -towardX * 45 * delta, -towardY * 45 * delta, obstacles, scene.width, scene.height);
  if (enemyActor.cooldown <= 0) {
    if (cycle > 5.4) {
      for (let index = 0; index < 8; index += 1) {
        const angle = (Math.PI * 2 * index) / 8 + enemyActor.patternTime * 0.15;
        runtime.projectiles.push({ x: enemyActor.x, y: enemyActor.y, vx: Math.cos(angle) * 145, vy: Math.sin(angle) * 145, radius: 8, life: 3.5, hostile: true });
      }
      enemyActor.cooldown = 1.7;
    } else {
      fireAtPlayer(runtime, enemyActor, 195);
      fireAtPlayer(runtime, enemyActor, 188, -0.16);
      fireAtPlayer(runtime, enemyActor, 188, 0.16);
      enemyActor.cooldown = 1.2;
    }
  }
}

export function updateEnemies(runtime: AdventureRuntime, delta: number, obstacles = scenes[runtime.scene].obstacles): void {
  for (const currentEnemy of runtime.enemies) {
    currentEnemy.cooldown = Math.max(0, currentEnemy.cooldown - delta);
    currentEnemy.patternTime += delta;
    currentEnemy.hitFlashTimer = Math.max(0, currentEnemy.hitFlashTimer - delta);
    if (currentEnemy.knockbackTimer > 0) {
      const knockbackDelta = Math.min(delta, currentEnemy.knockbackTimer);
      const scene = scenes[runtime.scene];
      moveActor(
        currentEnemy,
        currentEnemy.knockbackVelocity.x * knockbackDelta,
        currentEnemy.knockbackVelocity.y * knockbackDelta,
        obstacles,
        scene.width,
        scene.height,
      );
      currentEnemy.knockbackTimer = Math.max(0, currentEnemy.knockbackTimer - knockbackDelta);
      if (currentEnemy.knockbackTimer === 0) currentEnemy.knockbackVelocity = { x: 0, y: 0 };
      continue;
    }
    moveEnemy(currentEnemy, runtime, delta, obstacles);
  }
}

export function updateProjectiles(runtime: AdventureRuntime, delta: number, obstacles = scenes[runtime.scene].obstacles): void {
  const scene = scenes[runtime.scene];
  runtime.projectiles = runtime.projectiles.filter((projectile) => {
    projectile.x += projectile.vx * delta;
    projectile.y += projectile.vy * delta;
    projectile.life -= delta;
    if (projectile.life <= 0 || projectile.x < 0 || projectile.x > scene.width || projectile.y < 0 || projectile.y > scene.height) return false;
    return !obstacles.some((rect) => circleHitsRect(projectile.x, projectile.y, projectile.radius, rect));
  });
}

export function updatePlayerKnockback(runtime: AdventureRuntime, delta: number, obstacles = scenes[runtime.scene].obstacles): boolean {
  const player = runtime.player;
  if (player.knockbackTimer <= 0) return false;
  const knockbackDelta = Math.min(delta, player.knockbackTimer);
  const scene = scenes[runtime.scene];
  moveActor(player, player.knockbackVelocity.x * knockbackDelta, player.knockbackVelocity.y * knockbackDelta, obstacles, scene.width, scene.height);
  player.knockbackTimer = Math.max(0, player.knockbackTimer - knockbackDelta);
  player.moving = false;
  if (player.knockbackTimer === 0) player.knockbackVelocity = { x: 0, y: 0 };
  return true;
}

export function performAttack(runtime: AdventureRuntime, damage: number): EnemyActor[] {
  if (runtime.attackCooldown > 0) return [];
  runtime.attackTimer = 0.24;
  runtime.attackCooldown = 0.34;
  const direction = directionVector(runtime.player.direction);
  const greatSword = damage > 1;
  const attackRange = greatSword ? GREAT_SWORD_RANGE : BASIC_SWORD_RANGE;
  const halfAngle = greatSword ? GREAT_SWORD_HALF_ANGLE : BASIC_SWORD_HALF_ANGLE;
  const strikeCenter = {
    x: runtime.player.x + direction.x * attackRange * 0.55,
    y: runtime.player.y + direction.y * attackRange * 0.55,
  };
  const defeated: EnemyActor[] = [];
  for (const currentEnemy of runtime.enemies) {
    const offset = { x: currentEnemy.x - runtime.player.x, y: currentEnemy.y - runtime.player.y };
    const gap = Math.hypot(offset.x, offset.y);
    const facingDot = gap > 0.01 ? (offset.x * direction.x + offset.y * direction.y) / gap : 1;
    if (gap <= attackRange + currentEnemy.radius
      && facingDot >= Math.cos(halfAngle)
      && hasClearAttackPath(runtime.player, currentEnemy, scenes[runtime.scene].obstacles)) {
      currentEnemy.hp -= damage;
      currentEnemy.hitFlashTimer = 0.24;
      knockEnemyBack(runtime, currentEnemy, strikeCenter, direction);
      if (currentEnemy.hp <= 0) defeated.push(currentEnemy);
    }
  }
  runtime.enemies = runtime.enemies.filter((currentEnemy) => currentEnemy.hp > 0);
  defeated.filter((currentEnemy) => currentEnemy.kind !== "boss").forEach((currentEnemy) => {
    runtime.defeatEffects.push({
      enemy: { ...currentEnemy, knockbackVelocity: { ...currentEnemy.knockbackVelocity }, meleeDashVelocity: { ...currentEnemy.meleeDashVelocity } },
      timer: 0.72,
      duration: 0.72,
    });
  });
  return defeated;
}

function knockEnemyBack(runtime: AdventureRuntime, currentEnemy: EnemyActor, strikeCenter: Vec2, fallbackDirection: Vec2): void {
  const gap = distance(strikeCenter, currentEnemy);
  const direction = gap > 0.01
    ? { x: (currentEnemy.x - strikeCenter.x) / gap, y: (currentEnemy.y - strikeCenter.y) / gap }
    : fallbackDirection;
  const minimumOutsideRange = currentEnemy.radius + 41 - gap;
  const distanceToPush = currentEnemy.kind === "boss" ? 14 : Math.max(68, minimumOutsideRange);
  const duration = currentEnemy.kind === "boss" ? 0.16 : 0.22;
  const scene = scenes[runtime.scene];
  const angle = Math.atan2(direction.y, direction.x);
  const alternatives = [0, 0.42, -0.42, 0.82, -0.82, Math.PI / 2, -Math.PI / 2];
  for (const offset of alternatives) {
    const dx = Math.cos(angle + offset) * distanceToPush;
    const dy = Math.sin(angle + offset) * distanceToPush;
    if (canTraverseKnockbackPath(currentEnemy, dx, dy, scene.obstacles, scene.width, scene.height)) {
      currentEnemy.knockbackVelocity = { x: dx / duration, y: dy / duration };
      currentEnemy.knockbackTimer = duration;
      return;
    }
  }
}

function hasClearAttackPath(start: Vec2, end: Vec2, obstacles: Rect[]): boolean {
  const pathLength = distance(start, end);
  const steps = Math.max(1, Math.ceil(pathLength / 4));
  for (let step = 1; step < steps; step += 1) {
    const progress = step / steps;
    const x = start.x + (end.x - start.x) * progress;
    const y = start.y + (end.y - start.y) * progress;
    if (obstacles.some((rect) => circleHitsRect(x, y, 2, rect))) return false;
  }
  return true;
}

function canTraverseKnockbackPath(actor: EnemyActor, dx: number, dy: number, obstacles: Rect[], width: number, height: number): boolean {
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 4));
  for (let step = 1; step <= steps; step += 1) {
    const x = actor.x + dx * step / steps;
    const y = actor.y + dy * step / steps;
    if (!canOccupy(actor, x, y, obstacles, width, height)) return false;
  }
  return true;
}

export function damagePlayerIfHit(runtime: AdventureRuntime): boolean {
  if (runtime.elapsed < runtime.invulnerableUntil) return false;
  const touchingEnemy = runtime.enemies.find((currentEnemy) => distance(runtime.player, currentEnemy) < runtime.player.radius + currentEnemy.radius + 2);
  const projectileIndex = runtime.projectiles.findIndex((projectile) => projectile.hostile && distance(runtime.player, projectile) < runtime.player.radius + projectile.radius);
  const touchingProjectile = projectileIndex >= 0 ? runtime.projectiles[projectileIndex] : null;
  const touchingFire = runtime.enemies.find((currentEnemy) => currentEnemy.kind === "boss" && currentEnemy.specialPhase === "breathing" && bossFireHitsPlayer(currentEnemy, runtime.player));
  if (!touchingEnemy && projectileIndex < 0 && !touchingFire) return false;
  if (projectileIndex >= 0) runtime.projectiles.splice(projectileIndex, 1);
  const impactSource = touchingProjectile ?? touchingEnemy ?? touchingFire;
  let impactX = impactSource ? runtime.player.x - impactSource.x : 0;
  let impactY = impactSource ? runtime.player.y - impactSource.y : 0;
  let impactLength = Math.hypot(impactX, impactY);
  if (impactLength < 0.01 && touchingProjectile) {
    impactX = -touchingProjectile.vx;
    impactY = -touchingProjectile.vy;
    impactLength = Math.hypot(impactX, impactY);
  }
  if (impactLength < 0.01) {
    const facing = directionVector(runtime.player.direction);
    impactX = -facing.x;
    impactY = -facing.y;
    impactLength = 1;
  }
  const knockbackDuration = 0.24;
  const knockbackDistance = touchingFire ? 72 : 58;
  runtime.player.knockbackVelocity = {
    x: impactX / impactLength * knockbackDistance / knockbackDuration,
    y: impactY / impactLength * knockbackDistance / knockbackDuration,
  };
  runtime.player.knockbackTimer = knockbackDuration;
  runtime.player.moving = false;
  runtime.player.hp = Math.max(0, runtime.player.hp - 1);
  runtime.invulnerableUntil = runtime.elapsed + 0.9;
  return true;
}

function bossFireHitsPlayer(boss: EnemyActor, player: Actor): boolean {
  const start = { x: boss.x + Math.cos(boss.specialAngle) * 34, y: boss.y + Math.sin(boss.specialAngle) * 34 };
  const end = { x: start.x + Math.cos(boss.specialAngle) * BOSS_FIRE_LENGTH, y: start.y + Math.sin(boss.specialAngle) * BOSS_FIRE_LENGTH };
  return pointToSegmentDistance(player, start, end) <= player.radius + BOSS_FIRE_WIDTH / 2;
}

function pointToSegmentDistance(point: Vec2, start: Vec2, end: Vec2): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return distance(point, start);
  const position = clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared, 0, 1);
  return Math.hypot(point.x - (start.x + dx * position), point.y - (start.y + dy * position));
}

export function tickRuntime(runtime: AdventureRuntime, delta: number): void {
  runtime.elapsed += delta;
  runtime.attackTimer = Math.max(0, runtime.attackTimer - delta);
  runtime.attackCooldown = Math.max(0, runtime.attackCooldown - delta);
  runtime.defeatEffects = runtime.defeatEffects
    .map((effect) => ({ ...effect, timer: effect.timer - delta }))
    .filter((effect) => effect.timer > 0);
}
