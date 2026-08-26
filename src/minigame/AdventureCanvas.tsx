import { useCallback, useEffect, useRef, useState } from "react";
import blacksmithSpriteSource from "../image/game/blacksmith.png";
import fortuneTellerSpriteSource from "../image/fortune-teller-grandmother-sprite-128.png";
import heroSpriteSource from "../image/game/hero-sprites.png";
import princessSpriteSource from "../image/game/princess-left.png";
import dragonBossSpriteSource from "../image/dragon-boss-front-sprite-768.png";
import rangedSkullSpriteSource from "../image/purple-flame-skull-sprite-128.png";
import harpSpriteSource from "../image/u-shaped-harp-clue-sprite.png";
import meleeBatSpriteSource from "../image/vampire-bat-sprite-128.png";
import amazingSwordIcon from "../image/amazing-sword-sprite-512.png";
import oldSwordIcon from "../image/old-worn-sword-sprite-512.png";
import { useGameState } from "../state/GameStateContext";
import type { HintId } from "../state/types";
import { adventureText } from "../content/text";
import { playSfx, setFootsteps, stopAdventureSfx, stopSfx, type FootstepSurface } from "../SE/sfx";
import { setBgm, stopBgm } from "../BGM/bgm";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  BOSS_DEFEAT_DURATION,
  BOSS_FIRE_CHARGE_DURATION,
  BOSS_FIRE_LENGTH,
  BOSS_FIRE_WIDTH,
  BASIC_SWORD_HALF_ANGLE,
  BASIC_SWORD_RANGE,
  GREAT_SWORD_HALF_ANGLE,
  GREAT_SWORD_RANGE,
  clamp,
  createEnemies,
  createRuntime,
  damagePlayerIfHit,
  distance,
  movePlayer,
  performAttack,
  RUN_SPEED_MULTIPLIER,
  tickRuntime,
  updateEnemies,
  updatePlayerKnockback,
  updateProjectiles,
} from "./engine";
import { sceneCopy, scenes } from "./scenes";
import type { AdventureRuntime, DefeatEffect, EnemyActor, Rect, SceneExit, Vec2 } from "./types";

const BLACKSMITH = { x: 905, y: 410 };
const FORTUNE_TELLER = { x: 135, y: 410 };
const VILLAGE_WELL = { x: 520, y: 500 };
const VILLAGE_SIGN = { x: 680, y: 580 };
const SECRET_ALTAR = { x: 1060, y: 450 };
const PRINCESS = { x: 700, y: 330 };
const TREASURE_CHESTS: Array<{ scene: "dungeon" | "castle-2"; point: Vec2; hint: HintId }> = [
  { scene: "dungeon", point: { x: 1980, y: 620 }, hint: "shop-last" },
  { scene: "castle-2", point: { x: 750, y: 600 }, hint: "news-night" },
];
const LEVEL_UP_EFFECT_DURATION = 1.8;
const SCENE_FADE_OUT_DURATION = 0.32;
const SCENE_FADE_IN_DURATION = 0.42;
const BOSS_INTRO_TRIGGER_Y = 530;

type SceneTransitionState = {
  phase: "idle" | "out" | "waiting" | "in";
  timer: number;
  exit: SceneExit | null;
};

type SpriteSet = {
  hero: HTMLImageElement | null;
  blacksmith: HTMLImageElement | null;
  fortuneTeller: HTMLImageElement | null;
  princess: HTMLImageElement | null;
  melee: HTMLImageElement | null;
  ranged: HTMLImageElement | null;
  boss: HTMLImageElement | null;
  harp: HTMLImageElement | null;
  oldSword: HTMLImageElement | null;
  greatSword: HTMLImageElement | null;
};

export function AdventureCanvas() {
  const { state, dispatch, notify } = useGameState();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spritesRef = useRef<SpriteSet>({ hero: null, blacksmith: null, fortuneTeller: null, princess: null, melee: null, ranged: null, boss: null, harp: null, oldSword: null, greatSword: null });
  const stateRef = useRef(state);
  const notifyRef = useRef(notify);
  const pendingSpawnRef = useRef<Vec2 | null>(null);
  const runtimeRef = useRef<AdventureRuntime>(createRuntime(state.adGame.checkpoint, state.adGame.hp, state.adGame.maxHp));
  const keysRef = useRef(new Set<string>());
  const lastTimeRef = useRef(0);
  const attackHeldRef = useRef(false);
  const interactHeldRef = useRef(false);
  const transitionLockedRef = useRef(false);
  const princessDialogueRef = useRef(0);
  const blacksmithDialogueRef = useRef(false);
  const fortuneOpenRef = useRef(false);
  const fortuneGoldRef = useRef(state.adGame.gold);
  const villageSignDialogueRef = useRef(0);
  const levelUpTimerRef = useRef(0);
  const previousLevelRef = useRef(state.adGame.level);
  const previousGreatSwordRef = useRef(state.adGame.greatSwordPurchased);
  const swordRewardTimerRef = useRef<number | null>(null);
  const sceneTransitionRef = useRef<SceneTransitionState>({ phase: "idle", timer: 0, exit: null });
  const [paused, setPaused] = useState(false);
  const [showSwordReward, setShowSwordReward] = useState(false);
  const [fortuneOpen, setFortuneOpen] = useState(false);
  const [fortuneSelection, setFortuneSelection] = useState(0);
  const [fortuneMessage, setFortuneMessage] = useState<string>(adventureText.npc.fortuneTeller.intro);
  const [status, setStatus] = useState(sceneCopy[state.adGame.checkpoint].objective);

  useEffect(() => {
    stateRef.current = state;
    fortuneGoldRef.current = state.adGame.gold;
    notifyRef.current = notify;
  }, [notify, state]);

  useEffect(() => {
    fortuneOpenRef.current = fortuneOpen;
  }, [fortuneOpen]);

  const closeFortuneDialogue = useCallback(() => {
    setFortuneOpen(false);
    setStatus(sceneCopy.village.objective);
  }, []);

  const askFortune = useCallback((index: number) => {
    const option = adventureText.npc.fortuneTeller.options[index];
    if (!option) return;
    if (fortuneGoldRef.current < 15) {
      setFortuneMessage(adventureText.npc.fortuneTeller.insufficientGold);
      return;
    }
    fortuneGoldRef.current -= 15;
    dispatch({ type: "SPEND_ADVENTURE_GOLD", amount: 15 });
    setFortuneMessage(`할머니: ${option.answer}`);
  }, [dispatch]);

  useEffect(() => {
    if (!fortuneOpen) return;
    const onFortuneKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (!["arrowup", "arrowdown", "e", "enter", "escape"].includes(key)) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.repeat) return;
      if (key === "arrowup") setFortuneSelection((current) => (current + adventureText.npc.fortuneTeller.options.length - 1) % adventureText.npc.fortuneTeller.options.length);
      else if (key === "arrowdown") setFortuneSelection((current) => (current + 1) % adventureText.npc.fortuneTeller.options.length);
      else if (key === "escape") closeFortuneDialogue();
      else askFortune(fortuneSelection);
    };
    window.addEventListener("keydown", onFortuneKeyDown, true);
    return () => window.removeEventListener("keydown", onFortuneKeyDown, true);
  }, [askFortune, closeFortuneDialogue, fortuneOpen, fortuneSelection]);

  useEffect(() => {
    const load = (key: keyof SpriteSet, source: string) => {
      const image = new Image();
      image.src = source;
      image.onload = () => { spritesRef.current[key] = image; };
    };
    load("hero", heroSpriteSource);
    load("blacksmith", blacksmithSpriteSource);
    load("fortuneTeller", fortuneTellerSpriteSource);
    load("princess", princessSpriteSource);
    load("melee", meleeBatSpriteSource);
    load("ranged", rangedSkullSpriteSource);
    load("boss", dragonBossSpriteSource);
    load("harp", harpSpriteSource);
    load("oldSword", oldSwordIcon);
    load("greatSword", amazingSwordIcon);
  }, []);

  useEffect(() => {
    const progress = stateRef.current.adGame;
    const nextRuntime = createRuntime(state.adGame.checkpoint, progress.hp, progress.maxHp, pendingSpawnRef.current ?? scenes[state.adGame.checkpoint].spawn);
    if (state.adGame.checkpoint === "boss" && progress.bossDefeated) {
      nextRuntime.enemies = [];
      nextRuntime.bossPassageOpen = true;
      nextRuntime.bossIntroPhase = "battle";
    }
    runtimeRef.current = nextRuntime;
    pendingSpawnRef.current = null;
    if (sceneTransitionRef.current.phase === "waiting") {
      sceneTransitionRef.current = { phase: "in", timer: SCENE_FADE_IN_DURATION, exit: null };
      transitionLockedRef.current = true;
    } else transitionLockedRef.current = false;
    princessDialogueRef.current = 0;
    blacksmithDialogueRef.current = false;
    villageSignDialogueRef.current = 0;
    setFortuneOpen(false);
    setStatus(state.adGame.checkpoint === "boss" && !progress.bossDefeated ? adventureText.battle.bossApproach : sceneCopy[state.adGame.checkpoint].objective);
    stopSfx("dragonBreathCharge");
    stopSfx("dragonFireBeam");
    stopSfx("dragonBossRoar");
  }, [state.adGame.checkpoint]);

  useEffect(() => {
    runtimeRef.current.player.maxHp = state.adGame.maxHp;
    runtimeRef.current.player.hp = state.adGame.hp;
  }, [state.adGame.hp, state.adGame.maxHp]);

  useEffect(() => {
    if (state.adGame.level > previousLevelRef.current) {
      levelUpTimerRef.current = LEVEL_UP_EFFECT_DURATION;
      playSfx("levelUp");
    }
    previousLevelRef.current = state.adGame.level;
  }, [state.adGame.level]);

  useEffect(() => {
    if (!previousGreatSwordRef.current && state.adGame.greatSwordPurchased) {
      setShowSwordReward(true);
      if (swordRewardTimerRef.current !== null) window.clearTimeout(swordRewardTimerRef.current);
      swordRewardTimerRef.current = window.setTimeout(() => {
        setShowSwordReward(false);
        swordRewardTimerRef.current = null;
      }, 3000);
    }
    previousGreatSwordRef.current = state.adGame.greatSwordPurchased;
  }, [state.adGame.greatSwordPurchased]);

  useEffect(() => () => {
    if (swordRewardTimerRef.current !== null) window.clearTimeout(swordRewardTimerRef.current);
    stopAdventureSfx();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.matches("input, textarea, select, [contenteditable=true]")) return;
      if (fortuneOpenRef.current) return;
      const key = event.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) event.preventDefault();
      if (key === "p") setPaused((value) => !value);
      keysRef.current.add(key === " " ? "space" : key);
    };
    const onKeyUp = (event: KeyboardEvent) => keysRef.current.delete(event.key === " " ? "space" : event.key.toLowerCase());
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const canvasContext: CanvasRenderingContext2D = context;
    let frame = 0;

    function transition(exit: SceneExit) {
      if (transitionLockedRef.current) return;
      const progress = stateRef.current.adGame;
      if (exit.requiresLevel && progress.level < exit.requiresLevel) {
        nudgeAwayFromExit(runtimeRef.current, exit);
        setStatus(adventureText.gate.level);
        return;
      }
      if (exit.requiresGreatSword && !progress.greatSwordPurchased) {
        nudgeAwayFromExit(runtimeRef.current, exit);
        setStatus(adventureText.gate.sword);
        return;
      }
      transitionLockedRef.current = true;
      sceneTransitionRef.current = { phase: "out", timer: SCENE_FADE_OUT_DURATION, exit };
    }

    function processExits(runtime: AdventureRuntime) {
      if (runtime.scene === "boss" && !runtime.bossPassageOpen) return;
      const exit = scenes[runtime.scene].exits.find((candidate) =>
        (runtime.scene !== "boss" || Boolean(candidate.requiresBossDefeated))
        &&
        (!candidate.requiresBossDefeated || runtime.bossPassageOpen)
        && pointInRect(runtime.player, candidate.rect, runtime.player.radius));
      if (exit) transition(exit);
    }

    function rewardEnemy(defeated: EnemyActor) {
      if (defeated.kind === "boss") {
        const runtime = runtimeRef.current;
        stopBgm(1800);
        playSfx("dragonBossDefeatedExplosion");
        stopSfx("dragonBreathCharge");
        stopSfx("dragonFireBeam");
        runtime.bossDefeatTimer = BOSS_DEFEAT_DURATION;
        runtime.bossDefeatPosition = { x: defeated.x, y: defeated.y };
        runtime.projectiles = [];
        runtime.player.moving = false;
        setStatus(adventureText.battle.bossCollapse);
        return;
      }
      playSfx("monsterDefeated");
      const exp = defeated.kind === "ranged" ? 16 : 12;
      const gold = defeated.kind === "ranged" ? 12 : 8;
      dispatch({ type: "GAIN_ADVENTURE_REWARD", exp, gold });
      setStatus(adventureText.battle.reward(defeated.kind === "ranged" ? adventureText.enemies.ranged : adventureText.enemies.melee, exp, gold));
    }

    function attack(runtime: AdventureRuntime) {
      if (runtime.attackCooldown > 0) return;
      const greatSword = stateRef.current.adGame.greatSwordPurchased;
      const hpBefore = runtime.enemies.reduce((total, enemy) => total + enemy.hp, 0);
      playSfx(greatSword ? "amazingSwordSwing" : "oldSwordSwing");
      const defeated = performAttack(runtime, greatSword ? 2 : 1);
      const hpAfter = runtime.enemies.reduce((total, enemy) => total + enemy.hp, 0);
      if (hpAfter < hpBefore) playSfx(greatSword ? "amazingSwordHit" : "oldSwordHit");
      defeated.forEach(rewardEnemy);
    }

    function interact(runtime: AdventureRuntime) {
      if (runtime.scene === "boss" && runtime.bossIntroPhase === "dialogue") {
        const nextIndex = runtime.bossDialogueIndex + 1;
        if (nextIndex < adventureText.bossIntro.lines.length) {
          runtime.bossDialogueIndex = nextIndex;
          setStatus(adventureText.bossIntro.lines[nextIndex]);
        } else {
          runtime.bossIntroPhase = "battle";
          runtime.player.moving = false;
          setStatus(sceneCopy.boss.objective);
          setBgm("finalBattle");
          playSfx("dragonBossRoar");
        }
        return;
      }
      if (runtime.scene === "village") {
        if (distance(runtime.player, FORTUNE_TELLER) < 78) {
          fortuneGoldRef.current = stateRef.current.adGame.gold;
          setFortuneSelection(0);
          setFortuneMessage(adventureText.npc.fortuneTeller.intro);
          setFortuneOpen(true);
          keysRef.current.delete("e");
          return;
        }
        if (distance(runtime.player, BLACKSMITH) < 78) {
          if (blacksmithDialogueRef.current) {
            blacksmithDialogueRef.current = false;
            setStatus(sceneCopy.village.objective);
            return;
          }
          blacksmithDialogueRef.current = true;
          const progress = stateRef.current.adGame;
          if (progress.greatSwordPurchased) setStatus(adventureText.npc.blacksmithOwned);
          else if (progress.gold >= 45) {
            dispatch({ type: "BUY_GREAT_SWORD" });
            playSfx("importantItemObtained");
            setStatus(adventureText.equipment.greatSwordObtained);
          } else setStatus(adventureText.npc.blacksmithPrice(progress.gold));
          return;
        }
        if (distance(runtime.player, VILLAGE_WELL) < 66) {
          runtime.player.hp = runtime.player.maxHp;
          dispatch({ type: "REST_ADVENTURE" });
          playSfx("wellHeal");
          setStatus(adventureText.npc.well);
          return;
        }
        if (distance(runtime.player, VILLAGE_SIGN) < 78) {
          const nextLine = villageSignDialogueRef.current;
          if (nextLine < adventureText.npc.villageSign.length) {
            setStatus(adventureText.npc.villageSign[nextLine]);
            villageSignDialogueRef.current += 1;
          } else {
            villageSignDialogueRef.current = 0;
            setStatus(sceneCopy.village.objective);
          }
          return;
        }
      }
      if (runtime.scene === "secret" && distance(runtime.player, SECRET_ALTAR) < 78) {
        if (!stateRef.current.collectedLetters["game-u"]) {
          dispatch({ type: "COLLECT_LETTER", clue: "game-u" });
          playSfx("harpItemObtained");
          notifyRef.current(adventureText.clue.harpToast);
        }
        setStatus(adventureText.clue.harpStatus);
        return;
      }
      const treasure = treasureChestFor(runtime.scene);
      if (treasure && distance(runtime.player, treasure.point) < 78 && !stateRef.current.collectedHints[treasure.hint]) {
        dispatch({ type: "COLLECT_HINT", hint: treasure.hint });
        playSfx("treasureChestOpen");
        setStatus(adventureText.treasure.hints[treasure.hint]);
        notifyRef.current(adventureText.treasure.acquiredToast);
        return;
      }
      if (runtime.scene === "rescue" && distance(runtime.player, PRINCESS) < 90) {
        if (princessDialogueRef.current === 0) {
          princessDialogueRef.current = 1;
          setStatus(adventureText.npc.princessThanks);
          return;
        }
        if (princessDialogueRef.current === 1) {
          princessDialogueRef.current = 2;
          setStatus(adventureText.npc.princessGift);
          return;
        }
        if (!stateRef.current.collectedLetters["game-g"]) {
          dispatch({ type: "COLLECT_LETTER", clue: "game-g" });
          notifyRef.current(adventureText.clue.legendaryGToast);
        }
        playSfx("gameClear");
        dispatch({ type: "RESCUE_PRINCESS" });
      }
    }

    function update(time: number) {
      const runtime = runtimeRef.current;
      const delta = Math.min(0.032, (time - (lastTimeRef.current || time)) / 1000);
      lastTimeRef.current = time;
      if (!paused && runtime.scene !== "clear") {
        levelUpTimerRef.current = Math.max(0, levelUpTimerRef.current - delta);
        const attackDown = keysRef.current.has("space");
        const attackPressed = attackDown && !attackHeldRef.current;
        attackHeldRef.current = attackDown;
        const interactDown = keysRef.current.has("e");
        const interactPressed = interactDown && !interactHeldRef.current;
        interactHeldRef.current = interactDown;

        const sceneTransition = sceneTransitionRef.current;
        if (sceneTransition.phase !== "idle") {
          runtime.player.moving = false;
          if (sceneTransition.phase === "out") {
            sceneTransition.timer = Math.max(0, sceneTransition.timer - delta);
            if (sceneTransition.timer === 0 && sceneTransition.exit) {
              const exit = sceneTransition.exit;
              sceneTransitionRef.current = { phase: "waiting", timer: 0, exit: null };
              pendingSpawnRef.current = exit.spawn;
              dispatch({ type: "SET_CHECKPOINT", checkpoint: exit.to });
            }
          } else if (sceneTransition.phase === "in") {
            sceneTransition.timer = Math.max(0, sceneTransition.timer - delta);
            if (sceneTransition.timer === 0) {
              sceneTransitionRef.current = { phase: "idle", timer: 0, exit: null };
              transitionLockedRef.current = false;
            }
          }
        } else {
          tickRuntime(runtime, delta);
          if (runtime.bossDefeatTimer > 0) {
            runtime.player.moving = false;
            runtime.projectiles = [];
            runtime.bossDefeatTimer = Math.max(0, runtime.bossDefeatTimer - delta);
            if (runtime.bossDefeatTimer === 0 && !runtime.bossPassageOpen) {
              runtime.bossPassageOpen = true;
              dispatch({ type: "DEFEAT_BOSS" });
              setStatus(adventureText.battle.passageOpened);
              notifyRef.current(adventureText.battle.passageToast);
            }
          } else {
            const rescueDialogueActive = runtime.scene === "rescue" && princessDialogueRef.current > 0;
            if (runtime.scene === "boss" && runtime.bossIntroPhase === "approach" && runtime.player.y <= BOSS_INTRO_TRIGGER_Y) {
              runtime.bossIntroPhase = "dialogue";
              runtime.bossDialogueIndex = 0;
              runtime.player.moving = false;
              setStatus(adventureText.bossIntro.lines[0]);
            }
            const bossDialogueActive = runtime.scene === "boss" && runtime.bossIntroPhase === "dialogue";
            const bossCombatActive = runtime.scene !== "boss" || runtime.bossIntroPhase === "battle";
            const signDialogueActive = runtime.scene === "village" && villageSignDialogueRef.current > 0;
            const blacksmithDialogueActive = runtime.scene === "village" && blacksmithDialogueRef.current;
            const fortuneDialogueActive = runtime.scene === "village" && fortuneOpenRef.current;
            const obstacles = adventureObstacles(runtime.scene);
            if (!rescueDialogueActive && !bossDialogueActive && bossCombatActive && !signDialogueActive && !blacksmithDialogueActive && !fortuneDialogueActive && attackPressed) attack(runtime);
            const attackLocked = runtime.attackTimer > 0;
            const knockbackLocked = updatePlayerKnockback(runtime, delta, obstacles);
            if (rescueDialogueActive || bossDialogueActive || signDialogueActive || blacksmithDialogueActive || fortuneDialogueActive || attackLocked || knockbackLocked) runtime.player.moving = false;
            else movePlayer(runtime, keysRef.current, delta, obstacles, RUN_SPEED_MULTIPLIER);

            if (["dungeon", "castle-1", "castle-2", "boss"].includes(runtime.scene) && bossCombatActive) {
              const telegraphingBats = new Set(runtime.enemies.filter((enemy) => enemy.kind === "melee" && enemy.meleePhase === "telegraph").map((enemy) => enemy.id));
              const projectileCount = runtime.projectiles.length;
              const bossPhase = runtime.enemies.find((enemy) => enemy.kind === "boss")?.specialPhase;
              updateEnemies(runtime, delta, obstacles);
              if (runtime.enemies.some((enemy) => enemy.kind === "melee" && enemy.meleePhase === "telegraph" && !telegraphingBats.has(enemy.id))) playSfx("vampireBatSqueak");
              if (runtime.projectiles.length > projectileCount) playSfx("skullFireAttack");
              const nextBossPhase = runtime.enemies.find((enemy) => enemy.kind === "boss")?.specialPhase;
              if (bossPhase !== nextBossPhase) {
                if (nextBossPhase === "charging") {
                  stopSfx("dragonFireBeam");
                  playSfx("dragonBreathCharge");
                } else if (nextBossPhase === "breathing") {
                  stopSfx("dragonBreathCharge");
                  playSfx("dragonFireBeam");
                } else {
                  stopSfx("dragonBreathCharge");
                  stopSfx("dragonFireBeam");
                }
              }
              updateProjectiles(runtime, delta, obstacles);
            }

            if (interactPressed) interact(runtime);

            if (!rescueDialogueActive && !bossDialogueActive && bossCombatActive && damagePlayerIfHit(runtime)) {
              playSfx("heroHurt");
              dispatch({ type: "SET_ADVENTURE_HP", hp: runtime.player.hp });
              setStatus(runtime.player.hp > 0 ? adventureText.battle.damaged : adventureText.battle.defeated);
              if (runtime.player.hp <= 0 && !transitionLockedRef.current) {
                transitionLockedRef.current = true;
                pendingSpawnRef.current = { x: 520, y: 570 };
                dispatch({ type: "REST_ADVENTURE" });
                dispatch({ type: "SET_CHECKPOINT", checkpoint: "village" });
              }
            }

            if (runtime.scene === "dungeon" && runtime.enemies.length === 0) {
              runtime.respawnTimer += delta;
              if (runtime.respawnTimer >= 3.2) {
                runtime.enemies = createEnemies("dungeon");
                runtime.respawnTimer = 0;
                setStatus(adventureText.battle.respawn);
              }
            }
            if (!rescueDialogueActive && !bossDialogueActive && !signDialogueActive && !blacksmithDialogueActive && !fortuneDialogueActive) processExits(runtime);
          }
        }
      }
      const currentRuntime = runtimeRef.current;
      const footsteps = !paused
        && sceneTransitionRef.current.phase === "idle"
        && currentRuntime.bossDefeatTimer <= 0
        && currentRuntime.attackTimer <= 0
        && currentRuntime.bossIntroPhase !== "dialogue"
        && villageSignDialogueRef.current === 0
        && !blacksmithDialogueRef.current
        && !fortuneOpenRef.current
        && currentRuntime.player.moving
        ? footstepSurface(currentRuntime.scene)
        : null;
      setFootsteps(footsteps);
      draw(canvasContext, currentRuntime, paused, spritesRef.current, stateRef.current.adGame.greatSwordPurchased, stateRef.current.collectedLetters["game-u"], stateRef.current.collectedHints, levelUpTimerRef.current, sceneTransitionRef.current, blacksmithDialogueRef.current, fortuneOpenRef.current, princessDialogueRef.current > 0);
      frame = requestAnimationFrame(update);
    }
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [dispatch, paused]);

  const nextLevelExp = state.adGame.level * 30;
  return (
    <section className="adventure-wrap">
      <div className="game-stage">
        <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} aria-label="G의 전설 탑뷰 액션 RPG" />
        <div className="rpg-overlay-hud" aria-label="용사 상태">
          <span>LV {state.adGame.level}</span>
          <span className="hp-meter"><i style={{ width: `${(state.adGame.hp / state.adGame.maxHp) * 100}%` }} /></span>
          <b>{state.adGame.hp}/{state.adGame.maxHp}</b>
          <span>EXP {state.adGame.exp}/{nextLevelExp}</span>
          <span>{state.adGame.gold}G</span>
          <span className={state.adGame.greatSwordPurchased ? "equipped" : ""}>{state.adGame.greatSwordPurchased ? adventureText.equipment.greatSword : adventureText.equipment.oldSword}</span>
        </div>
        <button className="game-pause-overlay" onClick={() => setPaused((value) => !value)}>{paused ? adventureText.controls.continue : adventureText.controls.pause}</button>
        <div className={`rpg-equipment-slot ${state.adGame.greatSwordPurchased ? "great" : ""}`} aria-label={`장착 장비: ${state.adGame.greatSwordPurchased ? adventureText.equipment.greatSword : adventureText.equipment.oldSword}`}>
          <img src={state.adGame.greatSwordPurchased ? amazingSwordIcon : oldSwordIcon} alt="" />
        </div>
        {showSwordReward && <div className="great-sword-reward" aria-live="polite"><span /><img src={amazingSwordIcon} alt={adventureText.equipment.greatSword} /><strong>{adventureText.equipment.greatSwordObtained}</strong></div>}
        {fortuneOpen && (
          <section className="fortune-dialogue" role="dialog" aria-modal="true" aria-labelledby="fortune-dialogue-title">
            <header><strong id="fortune-dialogue-title">{adventureText.npc.fortuneTeller.name}</strong><span>복채 15G · 보유 {state.adGame.gold}G</span></header>
            <p>{fortuneMessage}</p>
            <small>{adventureText.npc.fortuneTeller.menuGuide}</small>
            <div className="fortune-options">
              {adventureText.npc.fortuneTeller.options.map((option, index) => (
                <button
                  key={option.label}
                  type="button"
                  className={fortuneSelection === index ? "selected" : ""}
                  onMouseEnter={() => setFortuneSelection(index)}
                  onClick={() => askFortune(index)}
                ><span>{index + 1}</span>{option.label}<em>15G</em></button>
              ))}
            </div>
            <button type="button" className="fortune-close" onClick={closeFortuneDialogue}>{adventureText.npc.fortuneTeller.close}</button>
          </section>
        )}
        <div className="rpg-dialogue" aria-live="polite">
          <span>{runtimeRef.current.bossIntroPhase === "dialogue" ? adventureText.bossIntro.speaker : sceneCopy[state.adGame.checkpoint].title}</span>
          <p>{status}</p>
        </div>
      </div>
      <div className="game-controls"><span><kbd>WASD</kbd><kbd>방향키</kbd> {adventureText.controls.move}</span><span><kbd>Space</kbd> {adventureText.controls.attack}</span><span><kbd>E</kbd> {adventureText.controls.interact}</span><span><kbd>P</kbd> {adventureText.controls.pause}</span></div>
    </section>
  );
}

function footstepSurface(scene: AdventureRuntime["scene"]): FootstepSurface | null {
  if (scene === "village") return "dirt";
  if (scene === "world" || scene === "secret") return "grass";
  if (scene === "dungeon" || scene === "castle-1" || scene === "castle-2" || scene === "boss" || scene === "rescue") return "stone";
  return null;
}

function treasureChestFor(scene: AdventureRuntime["scene"]) {
  return TREASURE_CHESTS.find((treasure) => treasure.scene === scene) ?? null;
}

function adventureObstacles(scene: AdventureRuntime["scene"]): Rect[] {
  const treasure = treasureChestFor(scene);
  const additions: Rect[] = [];
  if (scene === "village") additions.push({ x: VILLAGE_SIGN.x - 19, y: VILLAGE_SIGN.y - 28, width: 38, height: 40 });
  if (treasure) additions.push({ x: treasure.point.x - 25, y: treasure.point.y - 18, width: 50, height: 34 });
  return additions.length ? [...scenes[scene].obstacles, ...additions] : scenes[scene].obstacles;
}

function nudgeAwayFromExit(runtime: AdventureRuntime, exit: SceneExit) {
  const centerX = exit.rect.x + exit.rect.width / 2;
  const centerY = exit.rect.y + exit.rect.height / 2;
  const dx = runtime.player.x - centerX;
  const dy = runtime.player.y - centerY;
  if (Math.abs(dx) > Math.abs(dy)) runtime.player.x += Math.sign(dx || 1) * 34;
  else runtime.player.y += Math.sign(dy || 1) * 34;
}

function pointInRect(point: Vec2, rect: Rect, margin = 0) {
  return point.x >= rect.x - margin && point.x <= rect.x + rect.width + margin && point.y >= rect.y - margin && point.y <= rect.y + rect.height + margin;
}

function cameraFor(runtime: AdventureRuntime): Vec2 {
  const scene = scenes[runtime.scene];
  if (runtime.scene === "boss" && runtime.bossIntroPhase === "dialogue") {
    const boss = runtime.enemies.find((enemy) => enemy.kind === "boss");
    if (boss) {
      return {
        x: Math.round(clamp((runtime.player.x + boss.x) / 2 - CANVAS_WIDTH / 2, 0, Math.max(0, scene.width - CANVAS_WIDTH))),
        y: Math.round(clamp((runtime.player.y + boss.y) / 2 - CANVAS_HEIGHT / 2, 0, Math.max(0, scene.height - CANVAS_HEIGHT))),
      };
    }
  }
  return {
    x: Math.round(clamp(runtime.player.x - CANVAS_WIDTH / 2, 0, Math.max(0, scene.width - CANVAS_WIDTH))),
    y: Math.round(clamp(runtime.player.y - CANVAS_HEIGHT / 2, 0, Math.max(0, scene.height - CANVAS_HEIGHT))),
  };
}

function draw(context: CanvasRenderingContext2D, runtime: AdventureRuntime, paused: boolean, sprites: SpriteSet, hasGreatSword: boolean, hasU: boolean, collectedHints: Record<HintId, boolean>, levelUpTimer: number, sceneTransition: SceneTransitionState, blacksmithDialogueActive: boolean, fortuneDialogueActive: boolean, princessDialogueActive: boolean) {
  const camera = cameraFor(runtime);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  context.save();
  context.translate(-camera.x, -camera.y);
  drawGround(context, runtime.scene);
  drawMapObjects(context, runtime, sprites, hasU, collectedHints, blacksmithDialogueActive, fortuneDialogueActive, princessDialogueActive);
  drawBossSkill(context, runtime);
  drawBossDefeatEffect(context, runtime);
  runtime.projectiles.forEach((projectile) => {
    context.fillStyle = "#b884ff";
    context.beginPath(); context.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2); context.fill();
    context.strokeStyle = "rgba(230,210,255,.7)"; context.stroke();
  });
  runtime.defeatEffects.forEach((effect) => drawDefeatEffect(context, effect, sprites));
  runtime.enemies.forEach((currentEnemy) => drawEnemy(context, currentEnemy, sprites));
  drawAttackEffect(context, runtime, hasGreatSword);
  drawLevelUpEffect(context, runtime, levelUpTimer);
  const equippedSword = hasGreatSword ? sprites.greatSword : sprites.oldSword;
  if (runtime.player.direction === "up") drawSwordSwing(context, runtime, equippedSword, hasGreatSword);
  drawHero(context, runtime, sprites.hero);
  if (runtime.player.direction !== "up") drawSwordSwing(context, runtime, equippedSword, hasGreatSword);
  context.restore();
  const gradient = context.createRadialGradient(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 190, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 470);
  gradient.addColorStop(0, "rgba(0,0,0,0)"); gradient.addColorStop(1, "rgba(3,5,12,.42)");
  context.fillStyle = gradient; context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  if (runtime.scene === "boss" && runtime.bossIntroPhase === "dialogue") drawCutsceneBars(context);
  drawSceneTransition(context, sceneTransition);
  if (paused) {
    context.fillStyle = "rgba(5,8,16,.72)"; context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    context.fillStyle = "white"; context.font = "bold 30px monospace"; context.textAlign = "center"; context.fillText("PAUSED", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2); context.textAlign = "start";
  }
}

function drawCutsceneBars(context: CanvasRenderingContext2D) {
  const barHeight = 34;
  context.fillStyle = "rgba(4,3,8,.9)";
  context.fillRect(0, 0, CANVAS_WIDTH, barHeight);
  context.fillRect(0, CANVAS_HEIGHT - barHeight, CANVAS_WIDTH, barHeight);
}

function drawSceneTransition(context: CanvasRenderingContext2D, transition: SceneTransitionState) {
  if (transition.phase === "idle") return;
  let opacity = 1;
  if (transition.phase === "out") opacity = 1 - transition.timer / SCENE_FADE_OUT_DURATION;
  else if (transition.phase === "in") opacity = transition.timer / SCENE_FADE_IN_DURATION;
  context.fillStyle = `rgba(7,8,14,${Math.max(0, Math.min(1, opacity))})`;
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function tileNoise(x: number, y: number, salt: number) {
  const value = Math.sin(x * 12.9898 + y * 78.233 + salt * 31.7) * 43758.5453;
  return value - Math.floor(value);
}

function drawGround(context: CanvasRenderingContext2D, sceneId: AdventureRuntime["scene"]) {
  const scene = scenes[sceneId];
  const ground = scene.ground;
  const colors: Record<typeof ground, [string, string, string]> = {
    village: ["#91b975", "#7fa969", "#b9a56c"], grass: ["#579454", "#4b854e", "#7e9d5b"],
    dungeon: ["#343e47", "#2a333c", "#56616a"], castle: ["#463a4b", "#392f40", "#6b566d"],
    secret: ["#285540", "#204735", "#4f7d52"], rescue: ["#504661", "#40394f", "#766d83"],
  };
  const [base, alternate, accent] = colors[ground];
  context.fillStyle = base; context.fillRect(0, 0, scene.width, scene.height);
  const tile = 32;
  for (let y = 0; y < scene.height; y += tile) {
    for (let x = 0; x < scene.width; x += tile) {
      context.fillStyle = (x / tile + y / tile) % 2 === 0 ? alternate : base;
      context.globalAlpha = 0.24; context.fillRect(x, y, tile, tile); context.globalAlpha = 1;
      const noise = tileNoise(x, y, sceneId.length);
      if (noise > 0.58) {
        context.fillStyle = accent;
        if (["village", "grass", "secret"].includes(ground)) {
          context.fillRect(x + 8 + Math.floor(noise * 9), y + 10, 2, 7);
          context.fillRect(x + 12 + Math.floor(noise * 6), y + 13, 2, 4);
        } else {
          context.globalAlpha = 0.34;
          context.fillRect(x + 4, y + 5, 12, 2); context.fillRect(x + 14, y + 5, 2, 8);
          context.globalAlpha = 1;
        }
      }
    }
  }
  if (ground === "village") {
    drawPixelPath(context, [{ x: 0, y: 430 }, { x: 1200, y: 430 }], 96, "#c6ad72");
    drawPixelPath(context, [{ x: 520, y: 0 }, { x: 520, y: 760 }], 82, "#c6ad72");
  }
  if (ground === "grass") {
    drawPixelPath(context, [{ x: 0, y: 600 }, { x: 850, y: 600 }, { x: 500, y: 55 }], 64, "#b4a269");
    drawPixelPath(context, [{ x: 850, y: 600 }, { x: 1575, y: 55 }], 64, "#b4a269");
    drawPixelPath(context, [{ x: 850, y: 600 }, { x: 1780, y: 1040 }], 54, "#8e925b");
  }
  if (ground === "castle") {
    context.fillStyle = "rgba(116,61,79,.38)"; context.fillRect(scene.width / 2 - 72, 0, 144, scene.height);
    context.fillStyle = "rgba(214,174,108,.18)";
    for (let y = 24; y < scene.height; y += 96) context.fillRect(scene.width / 2 - 68, y, 136, 8);
  }
}

function drawPixelPath(context: CanvasRenderingContext2D, points: Vec2[], width: number, color: string) {
  context.strokeStyle = color; context.lineWidth = width; context.lineCap = "square"; context.lineJoin = "bevel";
  context.beginPath(); context.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach((point) => context.lineTo(point.x, point.y)); context.stroke();
}

function drawMapObjects(context: CanvasRenderingContext2D, runtime: AdventureRuntime, sprites: SpriteSet, hasU: boolean, collectedHints: Record<HintId, boolean>, blacksmithDialogueActive: boolean, fortuneDialogueActive: boolean, princessDialogueActive: boolean) {
  const scene = scenes[runtime.scene];
  scene.obstacles.forEach((obstacle, index) => {
    if (scene.ground === "village" && pointInRect(VILLAGE_WELL, obstacle)) return;
    if (scene.ground === "village" && index < 2) drawBuilding(context, obstacle, index);
    else if (scene.ground === "village") drawFenceOrStone(context, obstacle, index === 2 ? "#86775d" : "#6b5338");
    else if (scene.ground === "grass" || scene.ground === "secret") drawTreeCluster(context, obstacle);
    else drawDungeonWall(context, obstacle, scene.ground === "castle" ? "#66546b" : "#56616b");
  });
  if (runtime.scene !== "world") scene.exits.filter((exit) => !exit.hidden).forEach((exit) => drawExit(context, exit));

  if (runtime.scene === "village") {
    drawSpriteNpc(context, sprites.blacksmith, BLACKSMITH, 82);
    if (!blacksmithDialogueActive && distance(runtime.player, BLACKSMITH) < 92) drawInteractionPrompt(context, BLACKSMITH, adventureText.prompt.talk);
    drawSpriteNpc(context, sprites.fortuneTeller, FORTUNE_TELLER, 82);
    if (!fortuneDialogueActive && distance(runtime.player, FORTUNE_TELLER) < 92) drawInteractionPrompt(context, FORTUNE_TELLER, adventureText.prompt.talk);
    drawWell(context, VILLAGE_WELL);
    if (distance(runtime.player, VILLAGE_WELL) < 84) drawInteractionPrompt(context, VILLAGE_WELL, adventureText.prompt.recover);
    drawVillageSign(context, VILLAGE_SIGN);
    if (distance(runtime.player, VILLAGE_SIGN) < 92) drawInteractionPrompt(context, VILLAGE_SIGN, adventureText.prompt.inspect);
    drawForge(context, { x: 980, y: 410 });
  }
  if (runtime.scene === "world") {
    drawCaveEntrance(context, { x: 485, y: 70 });
    drawCastleGate(context, { x: 1575, y: 70 });
    scene.exits.filter((exit) => !exit.hidden).forEach((exit) => drawWorldEntrancePortal(context, exit));
  }
  if (runtime.scene === "secret" && !hasU) {
    context.fillStyle = "rgba(182,246,207,.16)"; context.beginPath(); context.arc(SECRET_ALTAR.x, SECRET_ALTAR.y, 66, 0, Math.PI * 2); context.fill();
    if (sprites.harp?.complete) context.drawImage(sprites.harp, SECRET_ALTAR.x - 58, SECRET_ALTAR.y - 73, 116, 116);
    if (distance(runtime.player, SECRET_ALTAR) < 92) drawInteractionPrompt(context, SECRET_ALTAR, adventureText.prompt.acquire);
  }
  const treasure = treasureChestFor(runtime.scene);
  if (treasure) {
    const opened = collectedHints[treasure.hint];
    drawTreasureChest(context, treasure.point, opened);
    if (!opened && distance(runtime.player, treasure.point) < 88) drawInteractionPrompt(context, treasure.point, adventureText.prompt.open);
  }
  if (runtime.scene === "boss") {
    const boss = runtime.enemies.find((enemy) => enemy.kind === "boss");
    if (boss && runtime.bossIntroPhase === "dialogue") drawInteractionPrompt(context, boss, adventureText.prompt.continue);
    if (runtime.bossPassageOpen) {
      drawHiddenPassage(context);
      scene.exits.filter((exit) => exit.requiresBossDefeated).forEach((exit) => drawExit(context, exit));
    }
  }
  if (runtime.scene === "rescue") {
    context.fillStyle = "rgba(255,225,158,.13)"; context.beginPath(); context.arc(PRINCESS.x, PRINCESS.y, 95, 0, Math.PI * 2); context.fill();
    drawSpriteNpc(context, sprites.princess, PRINCESS, 88);
    if (!princessDialogueActive && distance(runtime.player, PRINCESS) < 104) drawInteractionPrompt(context, PRINCESS, adventureText.prompt.talk);
  }
}

function drawVillageSign(context: CanvasRenderingContext2D, point: Vec2) {
  context.save();
  context.fillStyle = "#4a2c1d";
  context.fillRect(point.x - 5, point.y - 8, 10, 34);
  context.fillStyle = "#835333";
  context.fillRect(point.x - 29, point.y - 34, 58, 29);
  context.fillStyle = "#b9864f";
  context.fillRect(point.x - 25, point.y - 30, 50, 21);
  context.fillStyle = "#4f311f";
  context.fillRect(point.x - 17, point.y - 24, 23, 3);
  context.fillRect(point.x - 17, point.y - 18, 32, 3);
  context.fillStyle = "rgba(255,222,151,.3)";
  context.fillRect(point.x - 23, point.y - 28, 2, 17);
  context.restore();
}

function drawInteractionPrompt(context: CanvasRenderingContext2D, point: Vec2, label: string) {
  context.save();
  context.font = "bold 12px monospace";
  const width = context.measureText(label).width + 20;
  const x = point.x - width / 2;
  const y = point.y - 86;
  context.fillStyle = "rgba(15,14,23,.9)";
  context.fillRect(x, y, width, 25);
  context.strokeStyle = "rgba(240,202,111,.88)";
  context.lineWidth = 2;
  context.strokeRect(x, y, width, 25);
  context.fillStyle = "#ffe4a0";
  context.textAlign = "center";
  context.fillText(label, point.x, y + 17);
  context.textAlign = "start";
  context.restore();
}

function drawHiddenPassage(context: CanvasRenderingContext2D) {
  context.save();
  context.fillStyle = "#090812";
  context.fillRect(550, 0, 200, 118);
  context.strokeStyle = "#6f587c";
  context.lineWidth = 9;
  context.beginPath();
  context.moveTo(557, 116);
  context.lineTo(557, 64);
  context.arc(650, 64, 93, Math.PI, 0);
  context.lineTo(743, 116);
  context.stroke();
  for (let step = 0; step < 4; step += 1) {
    context.fillStyle = `rgba(125,100,145,${0.34 - step * 0.055})`;
    context.fillRect(570 + step * 14, 91 - step * 13, 160 - step * 28, 12);
  }
  for (let spark = 0; spark < 9; spark += 1) {
    const angle = spark * 1.91;
    context.fillStyle = spark % 2 ? "rgba(255,221,138,.72)" : "rgba(177,137,218,.7)";
    context.fillRect(646 + Math.cos(angle) * (38 + spark * 3), 59 + Math.sin(angle) * 28, 3, 3);
  }
  context.restore();
}

function drawBossDefeatEffect(context: CanvasRenderingContext2D, runtime: AdventureRuntime) {
  if (!runtime.bossDefeatPosition || runtime.bossDefeatTimer <= 0) return;
  const progress = 1 - runtime.bossDefeatTimer / BOSS_DEFEAT_DURATION;
  const opacity = Math.max(0, 1 - progress);
  const { x, y } = runtime.bossDefeatPosition;
  context.save();
  const glow = context.createRadialGradient(x, y, 5, x, y, 42 + progress * 95);
  glow.addColorStop(0, `rgba(255,255,220,${Math.min(1, opacity * 1.5)})`);
  glow.addColorStop(0.28, `rgba(255,151,48,${opacity * 0.88})`);
  glow.addColorStop(0.65, `rgba(158,54,126,${opacity * 0.55})`);
  glow.addColorStop(1, "rgba(52,16,63,0)");
  context.fillStyle = glow;
  context.beginPath();
  context.arc(x, y, 42 + progress * 95, 0, Math.PI * 2);
  context.fill();
  context.lineWidth = 7 - progress * 3;
  context.strokeStyle = `rgba(255,211,94,${opacity * 0.8})`;
  context.beginPath();
  context.arc(x, y, 28 + progress * 128, 0, Math.PI * 2);
  context.stroke();
  for (let particle = 0; particle < 18; particle += 1) {
    const angle = particle * (Math.PI * 2 / 18) + (particle % 3) * 0.23;
    const distanceFromBoss = 20 + progress * (72 + (particle % 5) * 15);
    const size = Math.max(2, 10 - progress * 7 - (particle % 3));
    context.fillStyle = particle % 3 === 0
      ? `rgba(187,79,198,${opacity})`
      : `rgba(255,${130 + (particle % 4) * 24},52,${opacity})`;
    context.fillRect(x + Math.cos(angle) * distanceFromBoss - size / 2, y + Math.sin(angle) * distanceFromBoss - size / 2, size, size);
  }
  context.restore();
}

function drawLevelUpEffect(context: CanvasRenderingContext2D, runtime: AdventureRuntime, timer: number) {
  if (timer <= 0) return;
  const progress = 1 - timer / LEVEL_UP_EFFECT_DURATION;
  const opacity = Math.min(1, progress / 0.12, timer / 0.42);
  const { x, y } = runtime.player;
  const pulse = (Math.sin(progress * Math.PI * 8) + 1) / 2;
  context.save();
  context.globalCompositeOperation = "screen";

  const aura = context.createRadialGradient(x, y, 5, x, y, 52 + pulse * 12);
  aura.addColorStop(0, `rgba(255,255,224,${opacity * 0.82})`);
  aura.addColorStop(0.38, `rgba(255,218,92,${opacity * 0.48})`);
  aura.addColorStop(0.72, `rgba(105,211,255,${opacity * 0.3})`);
  aura.addColorStop(1, "rgba(81,174,255,0)");
  context.fillStyle = aura;
  context.beginPath();
  context.arc(x, y, 64 + pulse * 8, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = `rgba(255,235,139,${opacity * (0.75 - progress * 0.28)})`;
  context.lineWidth = 4;
  context.beginPath();
  context.ellipse(x, y + 17, 24 + progress * 48, 9 + progress * 18, 0, 0, Math.PI * 2);
  context.stroke();

  for (let particle = 0; particle < 14; particle += 1) {
    const lane = (particle - 6.5) * 6.2;
    const rise = ((progress * 110 + particle * 13) % 92);
    const shimmer = 2 + (particle % 3);
    context.fillStyle = particle % 2
      ? `rgba(255,231,121,${opacity * 0.9})`
      : `rgba(145,224,255,${opacity * 0.82})`;
    context.fillRect(x + lane + Math.sin(progress * 7 + particle) * 4, y + 30 - rise, shimmer, 8 + shimmer);
  }
  context.textAlign = "center";
  context.font = "900 20px monospace";
  context.fillStyle = `rgba(255,239,153,${opacity})`;
  context.shadowColor = "rgba(255,194,52,.9)";
  context.shadowBlur = 12;
  context.fillText("LEVEL UP!", x, y - 58 - progress * 12);
  context.textAlign = "start";
  context.restore();
}

function drawHero(context: CanvasRenderingContext2D, runtime: AdventureRuntime, sprite: HTMLImageElement | null) {
  if (runtime.elapsed < runtime.invulnerableUntil && Math.floor(runtime.elapsed * 14) % 2 === 0) return;
  const player = runtime.player;
  const walkPhase = Math.floor(player.walkTime * 10) % 4;
  const stepping = player.moving && (walkPhase === 1 || walkPhase === 3);
  const bob = stepping && runtime.attackTimer <= 0 ? -2 : 0;
  if (player.moving) drawFootstepDust(context, runtime, walkPhase);
  context.fillStyle = "rgba(0,0,0,.25)"; context.beginPath(); context.ellipse(player.x, player.y + 18, stepping ? 17 : 19, stepping ? 6 : 7, 0, 0, Math.PI * 2); context.fill();
  if (sprite?.complete) {
    const row = { down: 0, left: 1, right: 2, up: 3 }[player.direction];
    const walkColumns = [0, 1, 0, 2];
    const column = runtime.attackTimer > 0 ? 3 : player.moving ? walkColumns[walkPhase] : 0;
    const drawSize = runtime.attackTimer > 0 ? 90 : 78;
    const drawX = player.x - drawSize / 2;
    const drawY = player.y - drawSize * 0.75 + bob;
    if (runtime.attackTimer > 0) {
      const swordMask = {
        down: [[20, 224], [26, 173], [68, 132], [87, 144], [61, 176], [48, 228]],
        left: [[0, 145], [67, 144], [67, 167], [0, 175]],
        right: [[180, 145], [256, 145], [256, 173], [180, 172]],
        up: [[201, 25], [256, 15], [256, 93], [201, 100]],
      }[player.direction];
      context.save();
      context.beginPath();
      context.rect(drawX, drawY, drawSize, drawSize);
      swordMask.forEach(([x, y], index) => {
        const maskX = drawX + x / 256 * drawSize;
        const maskY = drawY + y / 256 * drawSize;
        if (index === 0) context.moveTo(maskX, maskY);
        else context.lineTo(maskX, maskY);
      });
      context.closePath();
      context.clip("evenodd");
      context.drawImage(sprite, column * 256, row * 256, 256, 256, drawX, drawY, drawSize, drawSize);
      context.restore();
    } else {
      context.drawImage(sprite, column * 256, row * 256, 256, 256, drawX, drawY, drawSize, drawSize);
    }
  } else {
    context.fillStyle = "#233c61"; context.beginPath(); context.arc(player.x, player.y, 17, 0, Math.PI * 2); context.fill();
    context.fillStyle = "#d56b35"; context.fillRect(player.x - 17, player.y + 2, 34, 7);
  }
}

function drawFootstepDust(context: CanvasRenderingContext2D, runtime: AdventureRuntime, walkPhase: number) {
  if (walkPhase !== 1 && walkPhase !== 3) return;
  const player = runtime.player;
  const backward = { down: { x: 0, y: -1 }, left: { x: 1, y: 0 }, right: { x: -1, y: 0 }, up: { x: 0, y: 1 } }[player.direction];
  const side = walkPhase === 1 ? -1 : 1;
  context.fillStyle = "rgba(222,205,157,.42)";
  context.fillRect(Math.round(player.x + backward.x * 13 + backward.y * side * 5), Math.round(player.y + 18 + backward.y * 7 + backward.x * side * 5), 4, 3);
  context.fillStyle = "rgba(222,205,157,.24)";
  context.fillRect(Math.round(player.x + backward.x * 19 - backward.y * side * 4), Math.round(player.y + 20 + backward.y * 10 - backward.x * side * 4), 3, 2);
}

function drawAttackEffect(context: CanvasRenderingContext2D, runtime: AdventureRuntime, hasGreatSword: boolean) {
  if (runtime.attackTimer <= 0) return;
  const player = runtime.player;
  const angle = { down: Math.PI / 2, left: Math.PI, right: 0, up: -Math.PI / 2 }[player.direction];
  const progress = 1 - runtime.attackTimer / 0.24;
  const opacity = Math.sin(Math.min(1, progress) * Math.PI) * 0.82 + 0.16;
  const attackRange = hasGreatSword ? GREAT_SWORD_RANGE : BASIC_SWORD_RANGE;
  const halfAngle = hasGreatSword ? GREAT_SWORD_HALF_ANGLE : BASIC_SWORD_HALF_ANGLE;
  const animatedRange = attackRange * (0.84 + Math.sin(progress * Math.PI) * 0.16);
  const innerRadius = 17;

  context.save();
  context.translate(player.x, player.y);
  context.rotate(angle);
  context.globalCompositeOperation = "screen";
  const fanGlow = context.createRadialGradient(0, 0, innerRadius, 0, 0, animatedRange);
  fanGlow.addColorStop(0, hasGreatSword ? "rgba(255,174,43,0)" : "rgba(90,178,238,0)");
  fanGlow.addColorStop(0.55, hasGreatSword ? `rgba(255,185,55,${opacity * 0.28})` : `rgba(92,183,243,${opacity * 0.25})`);
  fanGlow.addColorStop(1, hasGreatSword ? `rgba(255,235,154,${opacity * 0.68})` : `rgba(220,247,255,${opacity * 0.62})`);
  context.fillStyle = fanGlow;
  context.beginPath();
  context.arc(0, 0, animatedRange, -halfAngle, halfAngle);
  context.arc(0, 0, innerRadius, halfAngle, -halfAngle, true);
  context.closePath();
  context.fill();

  context.strokeStyle = hasGreatSword ? `rgba(255,239,162,${opacity})` : `rgba(235,249,255,${opacity})`;
  context.lineWidth = hasGreatSword ? 4 : 3;
  context.lineCap = "round";
  context.beginPath();
  context.arc(0, 0, animatedRange, -halfAngle, halfAngle);
  context.stroke();

  context.strokeStyle = hasGreatSword ? `rgba(255,143,34,${opacity * 0.72})` : `rgba(77,174,240,${opacity * 0.68})`;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(Math.cos(-halfAngle) * innerRadius, Math.sin(-halfAngle) * innerRadius);
  context.lineTo(Math.cos(-halfAngle) * animatedRange, Math.sin(-halfAngle) * animatedRange);
  context.moveTo(Math.cos(halfAngle) * innerRadius, Math.sin(halfAngle) * innerRadius);
  context.lineTo(Math.cos(halfAngle) * animatedRange, Math.sin(halfAngle) * animatedRange);
  context.stroke();
  context.restore();
}

function drawSwordSwing(context: CanvasRenderingContext2D, runtime: AdventureRuntime, sprite: HTMLImageElement | null, hasGreatSword: boolean) {
  if (runtime.attackTimer <= 0 || !sprite?.complete) return;
  const progress = Math.max(0, Math.min(1, 1 - runtime.attackTimer / 0.24));
  const eased = 1 - Math.pow(1 - progress, 3);
  const facingAngle = { down: Math.PI / 2, left: Math.PI, right: 0, up: -Math.PI / 2 }[runtime.player.direction];
  const halfAngle = hasGreatSword ? GREAT_SWORD_HALF_ANGLE : BASIC_SWORD_HALF_ANGLE;
  const swingAngle = -halfAngle + eased * halfAngle * 2;
  const size = hasGreatSword ? 78 : 65;
  const imageAlignment = Math.PI * (70 / 180);
  const handOffset = {
    down: { x: -15, y: -14 },
    left: { x: -20, y: -13 },
    right: { x: 18, y: -12 },
    up: { x: 23, y: -28 },
  }[runtime.player.direction];

  const drawBlade = (angle: number, opacity: number) => {
    context.save();
    context.translate(runtime.player.x + handOffset.x, runtime.player.y + handOffset.y);
    context.rotate(facingAngle + angle + imageAlignment);
    context.globalAlpha = opacity;
    context.shadowColor = hasGreatSword ? "rgba(195,103,255,.82)" : "rgba(226,231,237,.55)";
    context.shadowBlur = hasGreatSword ? 13 : 7;
    context.drawImage(sprite, -size * 0.39, -size * 0.79, size, size);
    context.restore();
  };

  drawBlade(Math.max(-halfAngle, swingAngle - 0.26), 0.12);
  drawBlade(Math.max(-halfAngle, swingAngle - 0.13), 0.22);
  drawBlade(swingAngle, 0.96);
}

function drawBossSkill(context: CanvasRenderingContext2D, runtime: AdventureRuntime) {
  const boss = runtime.enemies.find((enemy) => enemy.kind === "boss");
  if (!boss || boss.specialPhase === "idle") return;
  const direction = { x: Math.cos(boss.specialAngle), y: Math.sin(boss.specialAngle) };
  const start = { x: boss.x + direction.x * 34, y: boss.y + direction.y * 34 };
  const end = { x: start.x + direction.x * BOSS_FIRE_LENGTH, y: start.y + direction.y * BOSS_FIRE_LENGTH };
  context.save();
  context.lineCap = "round";

  if (boss.specialPhase === "charging") {
    const progress = 1 - boss.specialTimer / BOSS_FIRE_CHARGE_DURATION;
    context.strokeStyle = `rgba(255,107,45,${0.08 + progress * 0.18})`;
    context.lineWidth = BOSS_FIRE_WIDTH;
    context.setLineDash([18, 13]);
    context.beginPath(); context.moveTo(start.x, start.y); context.lineTo(end.x, end.y); context.stroke();
    context.setLineDash([]);
    for (let index = 0; index < 7; index += 1) {
      const orbit = boss.patternTime * 5 + index * (Math.PI * 2 / 7);
      const radius = 28 - progress * 16 + (index % 2) * 5;
      context.fillStyle = index % 2 ? `rgba(255,193,64,${0.5 + progress * 0.45})` : `rgba(255,76,32,${0.45 + progress * 0.4})`;
      context.beginPath();
      context.arc(start.x + Math.cos(orbit) * radius, start.y + Math.sin(orbit) * radius, 3 + progress * 3, 0, Math.PI * 2);
      context.fill();
    }
    context.strokeStyle = `rgba(255,220,112,${0.55 + progress * 0.4})`;
    context.lineWidth = 4 + progress * 5;
    context.beginPath(); context.arc(start.x, start.y, 23 - progress * 10, 0, Math.PI * 2); context.stroke();
  } else {
    const pulse = (Math.sin(boss.patternTime * 18) + 1) / 2;
    context.strokeStyle = "rgba(128,26,18,.78)";
    context.lineWidth = BOSS_FIRE_WIDTH + 12 + pulse * 4;
    context.beginPath(); context.moveTo(start.x, start.y); context.lineTo(end.x, end.y); context.stroke();
    context.strokeStyle = "rgba(244,67,28,.92)";
    context.lineWidth = BOSS_FIRE_WIDTH;
    context.beginPath(); context.moveTo(start.x, start.y); context.lineTo(end.x, end.y); context.stroke();
    context.strokeStyle = "rgba(255,155,38,.96)";
    context.lineWidth = 36 + pulse * 5;
    context.beginPath(); context.moveTo(start.x, start.y); context.lineTo(end.x, end.y); context.stroke();
    context.strokeStyle = "rgba(255,238,136,.96)";
    context.lineWidth = 14 + pulse * 4;
    context.beginPath(); context.moveTo(start.x, start.y); context.lineTo(end.x, end.y); context.stroke();
    context.fillStyle = "rgba(255,207,70,.9)";
    context.beginPath(); context.arc(start.x, start.y, 24 + pulse * 6, 0, Math.PI * 2); context.fill();
  }
  context.restore();
}

function drawDefeatEffect(context: CanvasRenderingContext2D, effect: DefeatEffect, sprites: SpriteSet) {
  const sprite = sprites[effect.enemy.kind];
  if (!sprite?.complete) return;
  const progress = 1 - effect.timer / effect.duration;
  const opacity = Math.max(0, 1 - progress);
  const width = 64;
  const height = 64;
  const stripCount = 8;
  const sourceStripHeight = sprite.naturalHeight / stripCount;
  const destinationStripHeight = height / stripCount;
  context.save();
  context.globalAlpha = opacity * opacity;
  for (let strip = 0; strip < stripCount; strip += 1) {
    const driftX = (strip % 2 === 0 ? -1 : 1) * progress * (5 + strip * 1.4);
    const driftY = -progress * (8 + strip * 2.5);
    context.drawImage(
      sprite,
      0,
      sourceStripHeight * strip,
      sprite.naturalWidth,
      sourceStripHeight,
      effect.enemy.x - width / 2 + driftX,
      effect.enemy.y - 44 + destinationStripHeight * strip + driftY,
      width,
      destinationStripHeight + 1,
    );
  }
  for (let particle = 0; particle < 10; particle += 1) {
    const angle = particle * 2.17 + effect.enemy.phase;
    const spread = progress * (20 + particle * 2);
    context.fillStyle = effect.enemy.kind === "melee" ? `rgba(173,48,72,${opacity})` : `rgba(155,112,235,${opacity})`;
    context.fillRect(effect.enemy.x + Math.cos(angle) * spread, effect.enemy.y - 10 + Math.sin(angle) * spread - progress * 18, 3, 3);
  }
  context.restore();
}

function drawEnemy(context: CanvasRenderingContext2D, currentEnemy: EnemyActor, sprites: SpriteSet) {
  const bob = Math.round(Math.sin(currentEnemy.patternTime * (currentEnemy.kind === "boss" ? 2.2 : 5.5) + currentEnemy.phase) * (currentEnemy.kind === "boss" ? 2 : 3));
  if (currentEnemy.kind === "melee" && currentEnemy.meleePhase === "telegraph") {
    const speed = Math.hypot(currentEnemy.meleeDashVelocity.x, currentEnemy.meleeDashVelocity.y) || 1;
    const direction = { x: currentEnemy.meleeDashVelocity.x / speed, y: currentEnemy.meleeDashVelocity.y / speed };
    const target = { x: currentEnemy.x + direction.x * 138, y: currentEnemy.y + direction.y * 138 };
    const pulse = (Math.sin(currentEnemy.meleeTimer * 28) + 1) / 2;
    context.save();
    context.strokeStyle = `rgba(255,86,86,${0.42 + pulse * 0.4})`;
    context.lineWidth = 3;
    context.setLineDash([9, 7]);
    context.beginPath(); context.moveTo(currentEnemy.x, currentEnemy.y); context.lineTo(target.x, target.y); context.stroke();
    context.setLineDash([]);
    context.beginPath(); context.arc(target.x, target.y, 12 + pulse * 4, 0, Math.PI * 2); context.stroke();
    context.restore();
  }
  const shadowWidth = currentEnemy.kind === "boss" ? 64 : 20;
  context.fillStyle = "rgba(0,0,0,.3)"; context.beginPath(); context.ellipse(currentEnemy.x, currentEnemy.y + currentEnemy.radius, shadowWidth, currentEnemy.kind === "boss" ? 13 : 7, 0, 0, Math.PI * 2); context.fill();

  const sprite = sprites[currentEnemy.kind];
  if (sprite?.complete) {
    if (currentEnemy.kind === "boss") {
      const breathe = 1 + Math.sin(currentEnemy.patternTime * 2.2) * 0.015;
      const width = 190 * breathe;
      const height = 190 / breathe;
      context.drawImage(sprite, currentEnemy.x - width / 2, currentEnemy.y - height * 0.68 + bob, width, height);
    } else {
      const wingPulse = currentEnemy.kind === "melee" ? 1 + Math.sin(currentEnemy.patternTime * 8 + currentEnemy.phase) * 0.06 : 1;
      const width = 64 * wingPulse;
      context.drawImage(sprite, currentEnemy.x - width / 2, currentEnemy.y - 44 + bob, width, 64);
      if (currentEnemy.kind === "ranged") {
        context.strokeStyle = "rgba(203,185,255,.56)"; context.lineWidth = 2;
        context.beginPath(); context.arc(currentEnemy.x, currentEnemy.y + bob, 25 + Math.sin(currentEnemy.patternTime * 4) * 3, 0, Math.PI * 2); context.stroke();
      }
    }
    if (currentEnemy.hitFlashTimer > 0 && Math.floor(currentEnemy.hitFlashTimer * 40) % 2 === 1) {
      context.save();
      context.globalAlpha = 0.82;
      context.filter = "brightness(0) saturate(100%) invert(20%) sepia(100%) saturate(6800%) hue-rotate(356deg) brightness(118%) contrast(118%)";
      if (currentEnemy.kind === "boss") {
        const breathe = 1 + Math.sin(currentEnemy.patternTime * 2.2) * 0.015;
        const width = 190 * breathe;
        const height = 190 / breathe;
        context.drawImage(sprite, currentEnemy.x - width / 2, currentEnemy.y - height * 0.68 + bob, width, height);
      } else {
        const wingPulse = currentEnemy.kind === "melee" ? 1 + Math.sin(currentEnemy.patternTime * 8 + currentEnemy.phase) * 0.06 : 1;
        const width = 64 * wingPulse;
        context.drawImage(sprite, currentEnemy.x - width / 2, currentEnemy.y - 44 + bob, width, 64);
      }
      context.restore();
    }
  }

  const barWidth = currentEnemy.kind === "boss" ? 140 : 48;
  const barY = currentEnemy.y - (currentEnemy.kind === "boss" ? 142 : 55);
  context.fillStyle = "rgba(20,14,22,.86)"; context.fillRect(currentEnemy.x - barWidth / 2 - 2, barY - 2, barWidth + 4, 8);
  context.fillStyle = currentEnemy.kind === "boss" ? "#e65379" : "#e7bd67";
  context.fillRect(currentEnemy.x - barWidth / 2, barY, barWidth * (currentEnemy.hp / currentEnemy.maxHp), 4);
}

function drawBuilding(context: CanvasRenderingContext2D, rect: Rect, variant: number) {
  context.fillStyle = variant ? "#cfbd96" : "#e2d0a8"; context.fillRect(rect.x, rect.y + 44, rect.width, rect.height - 44);
  context.fillStyle = variant ? "#514a69" : "#8b5149";
  for (let y = rect.y + 8; y < rect.y + 58; y += 12) context.fillRect(rect.x - 12 + ((y / 12) % 2) * 8, y, rect.width + 24, 13);
  context.fillStyle = "#5f402f"; context.fillRect(rect.x + rect.width / 2 - 19, rect.y + rect.height - 54, 38, 54);
  context.fillStyle = "#7fb1bd"; context.fillRect(rect.x + 32, rect.y + 84, 38, 28); context.fillRect(rect.x + rect.width - 70, rect.y + 84, 38, 28);
  context.strokeStyle = "#eee0ba"; context.lineWidth = 4; context.strokeRect(rect.x + 32, rect.y + 84, 38, 28); context.strokeRect(rect.x + rect.width - 70, rect.y + 84, 38, 28);
}

function drawTreeCluster(context: CanvasRenderingContext2D, rect: Rect) {
  const points = [[0.18, 0.32], [0.48, 0.2], [0.76, 0.35], [0.34, 0.65], [0.7, 0.72]];
  points.forEach(([px, py], index) => {
    const x = rect.x + rect.width * px; const y = rect.y + rect.height * py;
    context.fillStyle = "#5b402b"; context.fillRect(x - 7, y + 9, 14, 25);
    context.fillStyle = index % 2 ? "#286541" : "#397849";
    context.fillRect(x - 18, y - 16, 36, 34); context.fillRect(x - 12, y - 24, 24, 10);
    context.fillStyle = "rgba(155,204,108,.33)"; context.fillRect(x - 12, y - 12, 15, 5);
  });
}

function drawFenceOrStone(context: CanvasRenderingContext2D, rect: Rect, color: string) {
  context.fillStyle = color; context.fillRect(rect.x, rect.y, rect.width, rect.height);
  context.strokeStyle = "rgba(255,255,255,.15)"; context.lineWidth = 3; context.strokeRect(rect.x + 4, rect.y + 4, rect.width - 8, rect.height - 8);
}

function drawDungeonWall(context: CanvasRenderingContext2D, rect: Rect, color: string) {
  context.fillStyle = "rgba(0,0,0,.25)"; context.fillRect(rect.x + 8, rect.y + 10, rect.width, rect.height);
  context.fillStyle = color; context.fillRect(rect.x, rect.y, rect.width, rect.height);
  context.strokeStyle = "rgba(225,225,230,.15)"; context.lineWidth = 3; context.strokeRect(rect.x + 5, rect.y + 5, rect.width - 10, rect.height - 10);
  context.strokeStyle = "rgba(20,20,28,.24)"; context.lineWidth = 2;
  for (let x = rect.x + 28; x < rect.x + rect.width; x += 48) { context.beginPath(); context.moveTo(x, rect.y + 4); context.lineTo(x - 8, rect.y + Math.min(30, rect.height - 4)); context.stroke(); }
}

function drawExit(context: CanvasRenderingContext2D, exit: SceneExit) {
  context.fillStyle = "rgba(255,223,145,.17)"; context.fillRect(exit.rect.x, exit.rect.y, exit.rect.width, exit.rect.height);
  context.strokeStyle = "rgba(255,236,166,.42)"; context.lineWidth = 3; context.strokeRect(exit.rect.x + 2, exit.rect.y + 2, exit.rect.width - 4, exit.rect.height - 4);
  context.fillStyle = "#fff0ba"; context.font = "bold 12px sans-serif"; context.textAlign = "center";
  context.fillText(exit.label, exit.rect.x + exit.rect.width / 2, exit.rect.y + exit.rect.height / 2 + 4); context.textAlign = "start";
}

function drawWorldEntrancePortal(context: CanvasRenderingContext2D, exit: SceneExit) {
  const centerX = exit.rect.x + exit.rect.width / 2;
  const centerY = exit.rect.y + exit.rect.height / 2;
  const glow = context.createRadialGradient(centerX, centerY, 4, centerX, centerY, Math.max(exit.rect.width, exit.rect.height) * 0.72);
  glow.addColorStop(0, "rgba(235,220,255,.2)");
  glow.addColorStop(0.58, "rgba(124,92,176,.14)");
  glow.addColorStop(1, "rgba(55,38,85,0)");
  context.fillStyle = glow;
  context.fillRect(exit.rect.x - 14, exit.rect.y - 14, exit.rect.width + 28, exit.rect.height + 28);
  context.fillStyle = "rgba(26,18,38,.2)";
  context.fillRect(exit.rect.x, exit.rect.y, exit.rect.width, exit.rect.height);
  context.strokeStyle = "rgba(214,190,255,.58)";
  context.lineWidth = 2;
  context.strokeRect(exit.rect.x + 1, exit.rect.y + 1, exit.rect.width - 2, exit.rect.height - 2);
}

function drawSpriteNpc(context: CanvasRenderingContext2D, sprite: HTMLImageElement | null, point: Vec2, size: number) {
  context.fillStyle = "rgba(0,0,0,.25)"; context.beginPath(); context.ellipse(point.x, point.y + 18, 20, 7, 0, 0, Math.PI * 2); context.fill();
  if (sprite?.complete) context.drawImage(sprite, point.x - size / 2, point.y - size * 0.76, size, size);
}

function drawWell(context: CanvasRenderingContext2D, point: Vec2) {
  context.fillStyle = "#776a5b"; context.fillRect(point.x - 32, point.y - 8, 64, 30);
  context.fillStyle = "#69a2b7"; context.beginPath(); context.ellipse(point.x, point.y - 7, 28, 13, 0, 0, Math.PI * 2); context.fill();
  context.strokeStyle = "#ded0a7"; context.lineWidth = 6; context.stroke();
  context.fillStyle = "#67462e"; context.fillRect(point.x - 34, point.y - 50, 7, 48); context.fillRect(point.x + 27, point.y - 50, 7, 48); context.fillRect(point.x - 38, point.y - 54, 76, 8);
}

function drawTreasureChest(context: CanvasRenderingContext2D, point: Vec2, opened: boolean) {
  context.save();
  context.fillStyle = "rgba(0,0,0,.32)";
  context.beginPath(); context.ellipse(point.x, point.y + 17, 31, 8, 0, 0, Math.PI * 2); context.fill();
  if (opened) {
    context.fillStyle = "#3b261d"; context.fillRect(point.x - 27, point.y - 8, 54, 27);
    context.fillStyle = "#76502b"; context.fillRect(point.x - 24, point.y - 5, 48, 19);
    context.fillStyle = "#2c1d19"; context.fillRect(point.x - 27, point.y - 26, 54, 10);
    context.fillStyle = "#8e6233"; context.fillRect(point.x - 22, point.y - 31, 44, 8);
  } else {
    context.fillStyle = "#3a261d"; context.fillRect(point.x - 28, point.y - 8, 56, 28);
    context.fillStyle = "#855a2e"; context.fillRect(point.x - 25, point.y - 5, 50, 20);
    context.fillStyle = "#a87437"; context.fillRect(point.x - 25, point.y - 20, 50, 16);
    context.fillStyle = "#654024"; context.fillRect(point.x - 21, point.y - 25, 42, 6);
    context.fillStyle = "#e1bd63"; context.fillRect(point.x - 4, point.y - 9, 8, 16);
    context.fillStyle = "#fff0a0"; context.fillRect(point.x - 2, point.y - 5, 4, 5);
  }
  context.restore();
}

function drawForge(context: CanvasRenderingContext2D, point: Vec2) {
  context.fillStyle = "#494044"; context.fillRect(point.x - 30, point.y - 20, 60, 44);
  context.fillStyle = "#e06638"; context.fillRect(point.x - 16, point.y - 8, 32, 22);
  context.fillStyle = "#ffd266"; context.fillRect(point.x - 8, point.y - 2, 16, 12);
}

function drawCaveEntrance(context: CanvasRenderingContext2D, point: Vec2) {
  context.fillStyle = "#4c5359"; context.fillRect(point.x - 82, point.y - 18, 164, 76);
  context.fillStyle = "#20262c"; context.beginPath(); context.arc(point.x, point.y + 55, 52, Math.PI, 0); context.fill(); context.fillRect(point.x - 52, point.y + 50, 104, 30);
}

function drawCastleGate(context: CanvasRenderingContext2D, point: Vec2) {
  context.fillStyle = "#58475d"; context.fillRect(point.x - 92, point.y - 36, 184, 116);
  context.fillStyle = "#2c2330"; context.fillRect(point.x - 42, point.y + 8, 84, 72);
  context.fillStyle = "#8d7390"; for (let x = point.x - 86; x < point.x + 86; x += 30) context.fillRect(x, point.y - 48, 22, 18);
}
