import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { withLegacyProject } from "./xcode-project-format.mjs";

const mobile = resolve(import.meta.dirname, "../apps/mobile");
const status = withLegacyProject(resolve(mobile, "ios/MojeAuto.xcodeproj"), () => {
  const result = spawnSync(
    "nub",
    ["exec", "sfw", "nub", "exec", "expo", "run:ios", "--no-install", ...process.argv.slice(2)],
    {
      cwd: mobile,
      env: process.env,
      stdio: "inherit",
    },
  );
  if (result.error) throw result.error;
  return result.status ?? 1;
});
process.exitCode = status;
