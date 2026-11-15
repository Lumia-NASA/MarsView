import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nasaWeather } from "./server/nasa-weather.mjs";
import { createDashboard } from "./server/dashboard.mjs";

export default defineConfig({
  plugins: [react(), tailwindcss(), {
    name: "nasa-weather",
    configureServer(server) {
      const dashboard = createDashboard();
      server.middlewares.use(dashboard.middleware);
      server.middlewares.use(nasaWeather);
      server.httpServer?.once('close', dashboard.close);
    },
    configurePreviewServer(server) {
      const dashboard = createDashboard();
      server.middlewares.use(dashboard.middleware);
      server.middlewares.use(nasaWeather);
      server.httpServer.once('close', dashboard.close);
    },
  }],
  server: {
    watch: {
      ignored: ["**/.taste-skill/**", "**/.impeccable/**", "**/artifacts/**", "**/aresnav-mars-main/backend/data/**"],
    },
  },
  build: { target: "es2022", sourcemap: false },
});
