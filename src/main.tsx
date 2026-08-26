import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { GameStateProvider } from "./state/GameStateContext";
import "./app/styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GameStateProvider>
      <App />
    </GameStateProvider>
  </StrictMode>,
);
