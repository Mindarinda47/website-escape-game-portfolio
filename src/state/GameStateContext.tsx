import { createContext, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from "react";
import { gameReducer } from "./gameReducer";
import { loadGameState, saveGameState } from "./persistence";
import type { GameAction, GameState } from "./types";

export type Toast = { id: number; message: string };

type GameContextValue = {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  toasts: Toast[];
  notify: (message: string) => void;
};

const GameStateContext = createContext<GameContextValue | null>(null);

export function GameStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, undefined, loadGameState);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => saveGameState(state), [state]);

  const value = useMemo<GameContextValue>(() => ({
    state,
    dispatch,
    toasts,
    notify(message) {
      const id = Date.now() + Math.random();
      setToasts((current) => [...current, { id, message }]);
      window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 3600);
    },
  }), [state, toasts]);

  return <GameStateContext.Provider value={value}>{children}</GameStateContext.Provider>;
}

export function useGameState(): GameContextValue {
  const context = useContext(GameStateContext);
  if (!context) throw new Error("useGameState must be used inside GameStateProvider");
  return context;
}
