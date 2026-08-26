import { describe, expect, it, vi } from "vitest";
import { createRuntime, damagePlayerIfHit, movePlayer, performAttack, RUN_SPEED_MULTIPLIER, updateEnemies, updatePlayerKnockback } from "../minigame/engine";

describe("G의 전설 엔진", () => {
  it("arms the boss intro only when entering the boss room", () => {
    expect(createRuntime("boss").bossIntroPhase).toBe("approach");
    expect(createRuntime("village").bossIntroPhase).toBe("inactive");
  });

  it("allows only one movement axis when diagonal keys are held", () => {
    const runtime = createRuntime("world", 6, 6, { x: 400, y: 240 });
    runtime.player.direction = "down";
    movePlayer(runtime, new Set(["d", "s"]), 0.1, []);
    expect(runtime.player.x).toBe(400);
    expect(runtime.player.y).toBeGreaterThan(240);
  });

  it("applies the run multiplier without changing direction rules", () => {
    const walking = createRuntime("world", 6, 6, { x: 900, y: 600 });
    const running = createRuntime("world", 6, 6, { x: 900, y: 600 });
    movePlayer(walking, new Set(["d"]), 0.1, [], 1);
    movePlayer(running, new Set(["d"]), 0.1, [], RUN_SPEED_MULTIPLIER);
    expect(running.player.x - 900).toBeCloseTo((walking.player.x - 900) * RUN_SPEED_MULTIPLIER);
    expect(running.player.y).toBe(600);
  });

  it("defeats a normal enemy in three basic hits or two great-sword hits", () => {
    const random = vi.spyOn(Math, "random").mockReturnValue(0.5);
    try {
      const basic = createRuntime("dungeon", 6, 6, { x: 100, y: 100 });
      basic.player.direction = "right";
      basic.enemies = [basic.enemies[0]];
      Object.assign(basic.enemies[0], { x: 142, y: 100 });
      for (let hit = 0; hit < 2; hit += 1) {
        Object.assign(basic.enemies[0], { x: 142, y: 100 });
        performAttack(basic, 1);
        basic.attackCooldown = 0;
      }
      expect(basic.enemies).toHaveLength(1);
      Object.assign(basic.enemies[0], { x: 142, y: 100 });
      performAttack(basic, 1);
      expect(basic.enemies).toHaveLength(0);
      expect(basic.defeatEffects).toHaveLength(1);

      const great = createRuntime("dungeon", 6, 6, { x: 100, y: 100 });
      great.player.direction = "right";
      great.enemies = [great.enemies[0]];
      Object.assign(great.enemies[0], { x: 142, y: 100 });
      performAttack(great, 2);
      great.attackCooldown = 0;
      Object.assign(great.enemies[0], { x: 142, y: 100 });
      performAttack(great, 2);
      expect(great.enemies).toHaveLength(0);
    } finally {
      random.mockRestore();
    }
  });

  it("animates normal and boss knockback over a short duration", () => {
    const normal = createRuntime("dungeon", 6, 6, { x: 100, y: 100 });
    normal.player.direction = "right";
    normal.enemies = [normal.enemies[0]];
    Object.assign(normal.enemies[0], { x: 142, y: 100 });
    performAttack(normal, 1);
    expect(normal.enemies[0].x).toBe(142);
    updateEnemies(normal, 0.11, []);
    expect(normal.enemies[0].x).toBeGreaterThan(142);
    expect(normal.enemies[0].x).toBeLessThan(210);
    updateEnemies(normal, 0.11, []);
    expect(normal.enemies[0].x).toBeCloseTo(210);

    const bossRuntime = createRuntime("boss", 6, 6, { x: 600, y: 230 });
    bossRuntime.player.direction = "right";
    const boss = bossRuntime.enemies[0];
    const startX = boss.x;
    performAttack(bossRuntime, 1);
    expect(boss.x).toBe(startX);
    updateEnemies(bossRuntime, 0.08, []);
    expect(boss.x - startX).toBeGreaterThan(0);
    expect(boss.x - startX).toBeLessThan(14);
    updateEnemies(bossRuntime, 0.08, []);
    expect(boss.x - startX).toBeCloseTo(14);
  });

  it("does not damage an enemy through a wall", () => {
    const runtime = createRuntime("dungeon", 6, 6, { x: 400, y: 170 });
    runtime.player.direction = "down";
    runtime.enemies = [runtime.enemies[0]];
    Object.assign(runtime.enemies[0], { x: 400, y: 255 });
    performAttack(runtime, 1);
    expect(runtime.enemies[0].hp).toBe(3);
  });

  it("gives the great sword a wider and longer fan-shaped hitbox", () => {
    const basic = createRuntime("dungeon", 6, 6, { x: 100, y: 100 });
    basic.player.direction = "right";
    basic.enemies = [basic.enemies[0]];
    Object.assign(basic.enemies[0], { x: 196, y: 100 });
    performAttack(basic, 1);
    expect(basic.enemies[0].hp).toBe(3);

    const great = createRuntime("dungeon", 6, 6, { x: 100, y: 100 });
    great.player.direction = "right";
    great.enemies = [great.enemies[0]];
    Object.assign(great.enemies[0], { x: 196, y: 100 });
    performAttack(great, 2);
    expect(great.enemies[0].hp).toBe(1);

    const sideTarget = createRuntime("dungeon", 6, 6, { x: 100, y: 100 });
    sideTarget.player.direction = "right";
    sideTarget.enemies = [sideTarget.enemies[0]];
    Object.assign(sideTarget.enemies[0], { x: 145, y: 160 });
    performAttack(sideTarget, 1);
    expect(sideTarget.enemies[0].hp).toBe(3);
    sideTarget.attackCooldown = 0;
    performAttack(sideTarget, 2);
    expect(sideTarget.enemies[0].hp).toBe(1);
  });

  it("gives ranged enemies a projectile attack pattern", () => {
    const random = vi.spyOn(Math, "random").mockReturnValue(0.5);
    try {
      const runtime = createRuntime("dungeon", 6, 6, { x: 400, y: 240 });
      runtime.enemies = [runtime.enemies.find((enemy) => enemy.kind === "ranged")!];
      Object.assign(runtime.enemies[0], { x: 470, y: 240 });
      runtime.enemies[0].cooldown = 0;
      updateEnemies(runtime, 0.1, []);
      expect(runtime.projectiles.length).toBeGreaterThan(0);
    } finally {
      random.mockRestore();
    }
  });

  it("does not aggro or fire through an obstacle", () => {
    const wall = [{ x: 140, y: 20, width: 24, height: 220 }];
    const runtime = createRuntime("dungeon", 6, 6, { x: 100, y: 100 });
    const melee = runtime.enemies.find((enemy) => enemy.kind === "melee")!;
    const ranged = runtime.enemies.find((enemy) => enemy.kind === "ranged")!;
    Object.assign(melee, { x: 220, y: 100, cooldown: 0 });
    Object.assign(ranged, { x: 240, y: 130, cooldown: 0 });
    runtime.enemies = [melee, ranged];

    updateEnemies(runtime, 0.1, wall);

    expect(melee.meleePhase).toBe("moving");
    expect(runtime.projectiles).toHaveLength(0);
  });

  it("telegraphs a bat dash and locks its direction before moving", () => {
    const runtime = createRuntime("dungeon", 6, 6, { x: 100, y: 100 });
    const bat = runtime.enemies.find((enemy) => enemy.kind === "melee")!;
    Object.assign(bat, { x: 240, y: 100, cooldown: 0 });
    runtime.enemies = [bat];

    updateEnemies(runtime, 0.1, []);
    expect(bat.meleePhase).toBe("telegraph");
    expect(bat.meleeDashVelocity.x).toBeLessThan(0);
    expect(Math.abs(bat.meleeDashVelocity.y)).toBeLessThan(0.001);

    runtime.player.y = 260;
    updateEnemies(runtime, 0.56, []);
    const dashStart = { x: bat.x, y: bat.y };
    updateEnemies(runtime, 0.1, []);
    expect(bat.x).toBeLessThan(dashStart.x);
    expect(bat.y).toBeCloseTo(dashStart.y);
  });

  it("charges for two seconds before the boss breathes fire for three seconds", () => {
    const runtime = createRuntime("boss", 6, 6, { x: 900, y: 230 });
    const boss = runtime.enemies[0];
    expect(boss.maxHp).toBe(60);
    boss.specialCooldown = 0;
    updateEnemies(runtime, 0.1, []);
    expect(boss.specialPhase).toBe("charging");
    expect(boss.specialTimer).toBe(2);

    boss.specialTimer = 0.4;
    boss.specialAngle = 0;
    runtime.player.x = 650;
    runtime.player.y = 500;
    updateEnemies(runtime, 0.1, []);
    expect(boss.specialAngle).toBe(0);

    updateEnemies(runtime, 0.31, []);
    expect(boss.specialPhase).toBe("breathing");
    expect(boss.specialTimer).toBe(3);
    runtime.player.x = 900;
    runtime.player.y = 230;
    runtime.elapsed = 1;
    expect(damagePlayerIfHit(runtime)).toBe(true);
    expect(runtime.player.hp).toBe(5);
    expect(runtime.player.knockbackTimer).toBeGreaterThan(0);
    const hitPosition = { x: runtime.player.x, y: runtime.player.y };
    updatePlayerKnockback(runtime, 0.1, []);
    expect(distanceFrom(hitPosition, runtime.player)).toBeGreaterThan(0);

    updateEnemies(runtime, 3.05, []);
    expect(boss.specialPhase).toBe("idle");
  });

  it("moves an exit spawn away from a blocking obstacle before play resumes", () => {
    const runtime = createRuntime("world", 6, 6, { x: 1275, y: 100 });
    const start = { x: runtime.player.x, y: runtime.player.y };
    movePlayer(runtime, new Set(["s"]), 0.1);
    expect(runtime.player.y).toBeGreaterThan(start.y);
  });

  it("blocks the village well while leaving the paved route below it open", () => {
    const wellApproach = createRuntime("village", 6, 6, { x: 520, y: 550 });
    movePlayer(wellApproach, new Set(["w"]), 0.3);
    expect(wellApproach.player.y).toBe(550);

    const lowerRoad = createRuntime("village", 6, 6, { x: 520, y: 640 });
    movePlayer(lowerRoad, new Set(["s"]), 0.3);
    expect(lowerRoad.player.y).toBeGreaterThan(640);
  });
});

function distanceFrom(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
