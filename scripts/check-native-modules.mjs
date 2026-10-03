import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Expo's verify command only warns about duplicates. Make them fail the quality gate.
const cwd = fileURLToPath(new URL("../apps/mobile/", import.meta.url));
for (const platform of ["apple", "android"]) {
  const result = spawnSync(
    "nub",
    ["exec", "--node", "expo-modules-autolinking", "search", "--platform", platform, "--json"],
    { cwd, encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
  );
  if (result.error || result.status !== 0) {
    throw new Error(`Autolinking failed for ${platform}: ${result.error ?? result.stderr}`);
  }
  const modules = Object.values(JSON.parse(result.stdout));
  if (modules.length === 0) throw new Error(`No native modules found for ${platform}`);
  for (const module of modules) {
    if (!Array.isArray(module.duplicates)) {
      throw new Error(`Unexpected autolinking result for ${module.name}`);
    }
    if (module.duplicates.length > 0) {
      console.error(`${platform}: duplicate native module ${module.name}`);
      console.error([module.path, ...module.duplicates.map((copy) => copy.path)].join("\n"));
      process.exitCode = 1;
    }
  }
  if (!modules.some((module) => module.duplicates.length > 0)) {
    console.log(`${platform}: ${modules.length} Expo modules, no duplicates`);
  }
}
