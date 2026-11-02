import { defineConfig } from "cypress";
import { loadEnvConfig } from "@next/env";
import { roomPlugins } from "./cypress/plugins/roomPlugins";

loadEnvConfig(process.cwd(), true);

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:3000",
    setupNodeEvents(on) {
      on("task", { ...roomPlugins });
    },
  },
});
