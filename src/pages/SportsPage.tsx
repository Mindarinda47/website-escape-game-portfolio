import { useEffect, useRef, useState } from "react";
import { useGameState } from "../state/GameStateContext";
import gangrimFcImage from "../image/강림FC.png";
import dorimFcImage from "../image/도림FC.png";
import { sportsText } from "../content/text";
import { playSfx } from "../SE/sfx";

type Prediction = "home" | "draw" | "away";
type Team = "home" | "away";
type SimPlayer = { id: string; team: Team; x: number; y: number; baseX: number; baseY: number; goalkeeper?: boolean };
type MatchSimulation = {
  elapsed: number;
  homeScore: number;
  awayScore: number;
  ball: { x: number; y: number; vx: number; vy: number };
  players: SimPlayer[];
  commentary: string;
  kickCooldown: number;
  restartDelay: number;
  lastKickerId: string | null;
};

const MATCH_SECONDS = 36;
const TICK_SECONDS = 0.1;
const CONTROL_DISTANCE = 1.45;
const CONTEST_DISTANCE = 1.75;

const formation: SimPlayer[] = [
  { id: "h-gk", team: "home", x: 7, y: 50, baseX: 7, baseY: 50, goalkeeper: true },
  { id: "h-1", team: "home", x: 25, y: 27, baseX: 25, baseY: 27 },
  { id: "h-2", team: "home", x: 25, y: 73, baseX: 25, baseY: 73 },
  { id: "h-3", team: "home", x: 42, y: 38, baseX: 42, baseY: 38 },
  { id: "h-4", team: "home", x: 42, y: 62, baseX: 42, baseY: 62 },
  { id: "a-gk", team: "away", x: 93, y: 50, baseX: 93, baseY: 50, goalkeeper: true },
  { id: "a-1", team: "away", x: 75, y: 27, baseX: 75, baseY: 27 },
  { id: "a-2", team: "away", x: 75, y: 73, baseX: 75, baseY: 73 },
  { id: "a-3", team: "away", x: 58, y: 38, baseX: 58, baseY: 38 },
  { id: "a-4", team: "away", x: 58, y: 62, baseX: 58, baseY: 62 },
];

function createKickoffFormation(kickoffTeam: Team): SimPlayer[] {
  const kickoffPlayerId = kickoffTeam === "home" ? "h-3" : "a-3";
  return formation.map((player) => {
    if (player.id === kickoffPlayerId) return { ...player, x: kickoffTeam === "home" ? 49 : 51, y: 50 };
    const xVariation = player.goalkeeper ? (Math.random() - 0.5) * 0.8 : (Math.random() - 0.5) * 3;
    const yVariation = (Math.random() - 0.5) * 5;
    return {
      ...player,
      x: Math.max(4, Math.min(96, player.baseX + xVariation)),
      y: Math.max(8, Math.min(92, player.baseY + yVariation)),
    };
  });
}

export function createSimulation(): MatchSimulation {
  return {
    elapsed: 0,
    homeScore: 0,
    awayScore: 0,
    ball: { x: 50, y: 50, vx: (Math.random() - 0.5) * 0.8, vy: (Math.random() - 0.5) * 0.5 },
    players: formation.map((player) => ({ ...player })),
    commentary: sportsText.initialCommentary,
    kickCooldown: 0,
    restartDelay: 0,
    lastKickerId: null,
  };
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function moveToward(player: SimPlayer, targetX: number, targetY: number, speed: number): SimPlayer {
  const dx = targetX - player.x;
  const dy = targetY - player.y;
  const length = Math.hypot(dx, dy) || 1;
  const step = Math.min(speed, length);
  return { ...player, x: player.x + (dx / length) * step, y: player.y + (dy / length) * step };
}

function nearestPlayer(players: SimPlayer[], team: Team, ball: MatchSimulation["ball"], outfieldOnly = false) {
  return players
    .filter((player) => player.team === team && (!outfieldOnly || !player.goalkeeper))
    .reduce((nearest, player) => distance(player, ball) < distance(nearest, ball) ? player : nearest);
}

function nearestOpponentDistance(players: SimPlayer[], player: SimPlayer) {
  const opponent: Team = player.team === "home" ? "away" : "home";
  return Math.min(...players.filter((candidate) => candidate.team === opponent).map((candidate) => distance(candidate, player)));
}

function movementPhase(player: SimPlayer) {
  return player.id.split("").reduce((sum, character) => sum + character.charCodeAt(0), 0) * 0.37;
}

function separateTeammates(players: SimPlayer[]): SimPlayer[] {
  return players.map((player) => {
    if (player.goalkeeper) return player;
    let pushX = 0;
    let pushY = 0;
    for (const teammate of players) {
      if (teammate.id === player.id || teammate.team !== player.team || teammate.goalkeeper) continue;
      const dx = player.x - teammate.x;
      const dy = player.y - teammate.y;
      const gap = Math.hypot(dx, dy);
      if (gap >= 7) continue;
      const angle = gap < 0.01 ? movementPhase(player) - movementPhase(teammate) : Math.atan2(dy, dx);
      const strength = (7 - gap) * 0.16;
      pushX += Math.cos(angle) * strength;
      pushY += Math.sin(angle) * strength;
    }
    return {
      ...player,
      x: Math.max(5, Math.min(95, player.x + pushX)),
      y: Math.max(7, Math.min(93, player.y + pushY)),
    };
  });
}

export function stepSimulation(current: MatchSimulation): MatchSimulation {
  if (current.elapsed >= MATCH_SECONDS) return current;
  if (current.restartDelay > 0) {
    return {
      ...current,
      elapsed: Math.min(MATCH_SECONDS, current.elapsed + TICK_SECONDS),
      kickCooldown: 0,
      restartDelay: Math.max(0, current.restartDelay - TICK_SECONDS),
    };
  }

  const homeChaser = nearestPlayer(current.players, "home", current.ball, true).id;
  const awayChaser = nearestPlayer(current.players, "away", current.ball, true).id;
  const lastKicker = current.players.find((player) => player.id === current.lastKickerId);
  const possessionTeam = lastKicker?.team ?? (distance(nearestPlayer(current.players, "home", current.ball), current.ball) < distance(nearestPlayer(current.players, "away", current.ball), current.ball) ? "home" : "away");
  const chaseX = Math.max(3, Math.min(97, current.ball.x + current.ball.vx * 1.4));
  const chaseY = Math.max(3, Math.min(97, current.ball.y + current.ball.vy * 1.4));
  let players = current.players.map((player) => {
    if (player.goalkeeper) {
      const targetY = Math.max(34, Math.min(66, current.ball.y));
      return moveToward(player, player.baseX, targetY, 0.62);
    }
    if (player.id === homeChaser || player.id === awayChaser) return moveToward(player, chaseX, chaseY, 1.02);
    const direction = player.team === "home" ? 1 : -1;
    const attacking = player.team === possessionTeam;
    const phase = movementPhase(player);
    const fieldShift = (current.ball.x - 50) * 0.22;
    const transitionShift = attacking ? direction * 8 : -direction * 3.5;
    const runnerShift = attacking && (player.id.endsWith("3") || player.id.endsWith("4")) ? direction * 5 : 0;
    const targetX = Math.max(9, Math.min(91, player.baseX + fieldShift + transitionShift + runnerShift + Math.sin(current.elapsed * 1.1 + phase) * 2.5));
    const targetY = Math.max(10, Math.min(90, player.baseY + (current.ball.y - 50) * 0.16 + Math.cos(current.elapsed * 1.35 + phase) * 6));
    return moveToward(player, targetX, targetY, attacking ? 0.7 : 0.62);
  });
  players = separateTeammates(players);

  const ball = {
    x: current.ball.x + current.ball.vx,
    y: current.ball.y + current.ball.vy,
    vx: current.ball.vx * 0.982,
    vy: current.ball.vy * 0.982,
  };
  let homeScore = current.homeScore;
  let awayScore = current.awayScore;
  let commentary = current.commentary;
  let kickCooldown = Math.max(0, current.kickCooldown - TICK_SECONDS);
  let lastKickerId = current.lastKickerId;

  const closestHome = nearestPlayer(players, "home", ball);
  const closestAway = nearestPlayer(players, "away", ball);
  const homeDistance = distance(closestHome, ball);
  const awayDistance = distance(closestAway, ball);
  const contested = homeDistance < CONTEST_DISTANCE && awayDistance < CONTEST_DISTANCE;

  if (contested && kickCooldown <= 0) {
    const angle = Math.random() * Math.PI * 2;
    const power = 2.6 + Math.random() * 1.6;
    ball.vx = Math.cos(angle) * power;
    ball.vy = Math.sin(angle) * power;
    ball.x += Math.cos(angle) * 1.8;
    ball.y += Math.sin(angle) * 1.8;
    kickCooldown = 0.45;
    lastKickerId = null;
    commentary = sportsText.commentary.contest;
  } else {
    const closest = homeDistance < awayDistance ? closestHome : closestAway;
    const ballSpeed = Math.hypot(ball.vx, ball.vy);
    if (distance(closest, ball) < CONTROL_DISTANCE && ballSpeed < 2.8 && kickCooldown <= 0) {
      const direction = closest.team === "home" ? 1 : -1;
      const inShootingRange = closest.team === "home" ? closest.x > 63 : closest.x < 37;
      const passCandidates = players.filter((player) => player.team === closest.team
        && player.id !== closest.id
        && player.id !== current.lastKickerId
        && !player.goalkeeper
        && distance(closest, player) >= 11);
      const passTarget = passCandidates.length > 0 ? passCandidates.reduce((best, candidate) => {
        const candidateDistance = distance(closest, candidate);
        const bestDistance = distance(closest, best);
        const score = direction * (candidate.x - closest.x) * 0.7 + nearestOpponentDistance(players, candidate) * 0.55 - Math.abs(candidateDistance - 24) * 0.18;
        const bestScore = direction * (best.x - closest.x) * 0.7 + nearestOpponentDistance(players, best) * 0.55 - Math.abs(bestDistance - 24) * 0.18;
        return score > bestScore ? candidate : best;
      }) : null;
      const shouldDribble = !inShootingRange && (passTarget === null || Math.random() < 0.34);
      const targetX = inShootingRange
        ? (closest.team === "home" ? 101 : -1)
        : shouldDribble ? closest.x + direction * (10 + Math.random() * 7) : passTarget!.x + direction * 1.5;
      const targetY = inShootingRange
        ? 50 + (Math.random() - 0.5) * 22
        : shouldDribble ? closest.y + (Math.random() - 0.5) * 14 : passTarget!.y + (Math.random() - 0.5) * 5;
      const dx = targetX - closest.x;
      const dy = targetY - closest.y;
      const length = Math.hypot(dx, dy) || 1;
      const power = inShootingRange ? 3.55 : shouldDribble ? 0.9 : Math.min(3.1, 2.05 + distance(closest, passTarget!) * 0.035);
      ball.vx = (dx / length) * power;
      ball.vy = (dy / length) * power;
      ball.x = closest.x + (dx / length) * 1.7;
      ball.y = closest.y + (dy / length) * 1.7;
      kickCooldown = shouldDribble ? 0.55 : 0.4;
      lastKickerId = closest.id;
      const teamName = closest.team === "home" ? sportsText.team.home : sportsText.team.away;
      commentary = inShootingRange
        ? sportsText.commentary.shot(teamName)
        : shouldDribble
          ? sportsText.commentary.dribble(teamName)
          : sportsText.commentary.pass(teamName);
    }
  }

  if (ball.y <= 2 || ball.y >= 98) {
    ball.y = Math.max(2, Math.min(98, ball.y));
    ball.vy *= -0.72;
  }

  if (ball.x >= 99) {
    if (ball.y >= 35 && ball.y <= 65) {
      homeScore += 1;
      Object.assign(ball, { x: 50, y: 50, vx: 0, vy: 0 });
      players = createKickoffFormation("away");
      kickCooldown = 0;
      lastKickerId = null;
      commentary = sportsText.commentary.homeGoal;
    } else {
      ball.x = 98;
      ball.vx = -Math.abs(ball.vx) * 0.65;
      commentary = sportsText.commentary.homeMiss;
    }
  } else if (ball.x <= 1) {
    if (ball.y >= 35 && ball.y <= 65) {
      awayScore += 1;
      Object.assign(ball, { x: 50, y: 50, vx: 0, vy: 0 });
      players = createKickoffFormation("home");
      kickCooldown = 0;
      lastKickerId = null;
      commentary = sportsText.commentary.awayGoal;
    } else {
      ball.x = 2;
      ball.vx = Math.abs(ball.vx) * 0.65;
      commentary = sportsText.commentary.awayMiss;
    }
  }

  const restartDelay = homeScore !== current.homeScore || awayScore !== current.awayScore ? 0.8 : 0;
  return { elapsed: Math.min(MATCH_SECONDS, current.elapsed + TICK_SECONDS), homeScore, awayScore, ball, players, commentary, kickCooldown, restartDelay, lastKickerId };
}

function outcomeOf(homeScore: number, awayScore: number): Prediction {
  if (homeScore > awayScore) return "home";
  if (homeScore < awayScore) return "away";
  return "draw";
}

export function SportsPage() {
  const { state, dispatch, notify } = useGameState();
  const [running, setRunning] = useState(false);
  const [simulation, setSimulation] = useState<MatchSimulation>(createSimulation);
  const previousSimulationRef = useRef(simulation);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setSimulation(stepSimulation), TICK_SECONDS * 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  useEffect(() => {
    if (!running || simulation.elapsed < MATCH_SECONDS) return;
    finishMatch();
  });

  useEffect(() => {
    const previous = previousSimulationRef.current;
    if (running) {
      if (simulation.homeScore > previous.homeScore || simulation.awayScore > previous.awayScore) playSfx("footballWhistle");
      else if (simulation.kickCooldown > previous.kickCooldown + 0.15) playSfx("footballBallContact");
    }
    previousSimulationRef.current = simulation;
  }, [running, simulation]);

  function startMatch(prediction: Prediction) {
    const nextSimulation = createSimulation();
    dispatch({ type: "START_MATCH", prediction });
    previousSimulationRef.current = nextSimulation;
    setSimulation(nextSimulation);
    playSfx("footballWhistle");
    setRunning(true);
  }

  function finishMatch(result: MatchSimulation = simulation) {
    if (!running) return;
    const outcome = outcomeOf(result.homeScore, result.awayScore);
    const predictionWasCorrect = state.sports.prediction === outcome;
    setRunning(false);
    setSimulation(result);
    dispatch({ type: "FINISH_MATCH", outcome, homeScore: result.homeScore, awayScore: result.awayScore });
    notify(predictionWasCorrect ? sportsText.toast.success : sportsText.toast.failed);
  }

  function skipMatch() {
    let finalSimulation = simulation;
    while (finalSimulation.elapsed < MATCH_SECONDS) finalSimulation = stepSimulation(finalSimulation);
    finishMatch(finalSimulation);
  }

  const matchDone = state.sports.simulationCompleted;
  const homeScore = matchDone ? state.sports.homeScore : simulation.homeScore;
  const awayScore = matchDone ? state.sports.awayScore : simulation.awayScore;
  const minute = Math.min(90, Math.round((simulation.elapsed / MATCH_SECONDS) * 90));

  return (
    <main className="sports-page page-inner">
      <header className="site-header sports-header"><div><span className="site-kicker">{sportsText.kicker}</span><h1>{sportsText.title}</h1></div><div className="live-chip">{sportsText.liveChip}</div></header>
      <section className="match-hero sports-match-hero">
        <div className="team home-team"><span className="team-crest"><img src={gangrimFcImage} alt="" /></span><h2>{sportsText.team.home}</h2><small>HOME</small></div>
        <div className="score-board"><span>{running ? `${minute}'` : matchDone ? sportsText.ended : sportsText.scheduled}</span><strong>{running || matchDone ? `${homeScore} : ${awayScore}` : "- : -"}</strong><small>{sportsText.venue}</small></div>
        <div className="team away-team"><span className="team-crest"><img src={dorimFcImage} alt="" /></span><h2>{sportsText.team.away}</h2><small>AWAY</small></div>
        <div className="pitch simulation-pitch" aria-hidden="true">
          <i className="center-circle" />
          <i className="goal goal-home" /><i className="goal goal-away" />
          {simulation.players.map((player) => <i key={player.id} className={`sim-player ${player.team} ${player.goalkeeper ? "goalkeeper" : ""}`} style={{ left: `${player.x}%`, top: `${player.y}%` }} />)}
          <i className="ball" style={{ left: `${simulation.ball.x}%`, top: `${simulation.ball.y}%` }} />
        </div>
      </section>

      {!running && !matchDone && <section className="prediction-panel"><span className="eyebrow">{sportsText.predictionLabel}</span><h2>{sportsText.predictionTitle}</h2><div className="prediction-buttons"><button onClick={() => startMatch("home")}><b>{sportsText.homeWin}</b><span>{sportsText.team.home}</span></button><button onClick={() => startMatch("draw")}><b>{sportsText.draw}</b><span>{sportsText.sameScore}</span></button><button onClick={() => startMatch("away")}><b>{sportsText.awayWin}</b><span>{sportsText.team.away}</span></button></div></section>}

      {running && <section className="commentary" aria-live="polite"><div className="match-progress"><i style={{ width: `${(simulation.elapsed / MATCH_SECONDS) * 100}%` }} /></div><h2>{simulation.commentary}</h2>{state.sports.attempts > 0 && <button className="button ghost" onClick={skipMatch}>{sportsText.skip}</button>}</section>}

      {matchDone && <section className={`match-result ${state.sports.predictionWasCorrect ? "correct" : "failed"}`}><div className="result-badge">{state.sports.predictionWasCorrect ? sportsText.predictionSuccess : sportsText.predictionFailed}</div><div><h2>{sportsText.finalScore(state.sports.homeScore, state.sports.awayScore)}</h2>{state.sports.predictionWasCorrect ? <p className="reward-note">{sportsText.reward}</p> : <p>{sportsText.noReward}</p>}</div>{!state.sports.predictionWasCorrect && <button className="button ghost" onClick={() => dispatch({ type: "RETRY_MATCH" })}>{sportsText.retry}</button>}</section>}
    </main>
  );
}
