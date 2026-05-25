import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
    // Make sure tests run sequentially to prevent database locking/conflicts
    fileParallelism: false,
    maxWorkers: 1,
    minWorkers: 1,
  },
});
