import { describe, expect, it, vi } from "vitest";
import { createSimulation, stepSimulation } from "../pages/SportsPage";

describe("sports match simulation", () => {
  it("resets every player and gives kickoff to the team that conceded", () => {
    const random = vi.spyOn(Math, "random").mockReturnValue(0.5);
    try {
      const beforeGoal = createSimulation();
      beforeGoal.ball = { x: 99.5, y: 50, vx: 1, vy: 0 };
      beforeGoal.kickCooldown = 1;

      const afterGoal = stepSimulation(beforeGoal);
      const awayKickoffPlayer = afterGoal.players.find((player) => player.id === "a-3");

      expect(afterGoal.homeScore).toBe(1);
      expect(afterGoal.awayScore).toBe(0);
      expect(afterGoal.ball).toEqual({ x: 50, y: 50, vx: 0, vy: 0 });
      expect(awayKickoffPlayer).toMatchObject({ team: "away", x: 51, y: 50 });
      expect(afterGoal.restartDelay).toBeCloseTo(0.8);

      const waitingForKickoff = stepSimulation(afterGoal);
      expect(waitingForKickoff.players).toEqual(afterGoal.players);
      expect(waitingForKickoff.ball).toEqual(afterGoal.ball);
    } finally {
      random.mockRestore();
    }
  });

  it("does not immediately return the ball to the previous passer", () => {
    const random = vi.spyOn(Math, "random").mockReturnValue(0.5);
    try {
      const simulation = createSimulation();
      simulation.ball = { x: 50, y: 50, vx: 0, vy: 0 };
      simulation.lastKickerId = "h-2";
      simulation.players = simulation.players.map((player) => {
        if (player.id === "h-1") return { ...player, x: 50, y: 50 };
        if (player.id === "h-2") return { ...player, x: 65, y: 50 };
        return player;
      });

      const next = stepSimulation(simulation);

      expect(next.lastKickerId).toBe("h-1");
      expect(next.ball.vx).toBeLessThan(0);
    } finally {
      random.mockRestore();
    }
  });

  it("moves defensive lines during changes of possession", () => {
    const random = vi.spyOn(Math, "random").mockReturnValue(0.5);
    try {
      const simulation = createSimulation();
      simulation.ball = { x: 70, y: 50, vx: 0, vy: 0 };
      simulation.lastKickerId = "h-3";
      simulation.kickCooldown = 10;

      const next = stepSimulation(simulation);
      const homeDefender = next.players.find((player) => player.id === "h-1");
      const awayDefender = next.players.find((player) => player.id === "a-1");

      expect(homeDefender!.x).toBeGreaterThan(25.5);
      expect(awayDefender!.x).toBeGreaterThan(75.5);
    } finally {
      random.mockRestore();
    }
  });
});
