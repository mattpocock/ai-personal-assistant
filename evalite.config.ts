import { defineConfig } from "evalite/config";
import config from "./vitest.config";

export default defineConfig({
  viteConfig: config,
  testTimeout: 120_000, // 2 minutes
});
