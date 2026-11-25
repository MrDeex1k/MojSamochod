import { mobile } from "@e2e-dev/mobile";
import type { E2EConfig } from "e2e";

const device = process.env.MOJE_AUTO_E2E_DEVICE;
if (!device) {
  throw new Error("Set MOJE_AUTO_E2E_DEVICE to the QA simulator UDID or Android emulator serial.");
}

const app = { bundleId: "dev.mojeauto.qa" };

export default {
  tests: ["tests/native/**/*.e2e.ts"],
  targets: [
    { name: "ios", engine: mobile({ platform: "ios", device }), app },
    { name: "android", engine: mobile({ platform: "android", device }), app },
  ],
  workers: 1,
  retries: 0,
  trace: "retain-on-failure",
} satisfies E2EConfig;
