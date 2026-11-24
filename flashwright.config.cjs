const { defineConfig } = require("@playwright/test");

const baseURL = "http://127.0.0.1:8097";

module.exports = defineConfig({
  testDir: "./tests/web",
  outputDir: "./.cache/flashwright/results",
  reporter: "list",
  timeout: 60_000,
  use: {
    baseURL,
    browserName: "chromium",
    isolation: "strict",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "nub run web --localhost --port 8097",
    url: baseURL,
    env: { BROWSER: "none", CI: "1", EXPO_OFFLINE: "1" },
    reuseExistingServer: false,
    timeout: 90_000,
  },
});
