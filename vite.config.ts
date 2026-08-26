import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => ({
  base: command === "build" ? "/website-escape-game/" : "/",
  plugins: [react()],
  test: {
    globals: true,
  },
}));
