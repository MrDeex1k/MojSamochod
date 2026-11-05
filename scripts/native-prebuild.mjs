import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, relative, resolve } from "node:path";

export const root = resolve(import.meta.dirname, "..");
export const mobile = resolve(root, "apps/mobile");

export function nativeConfigFingerprint(projectRoot = root) {
  const inputs = [
    ".node-version",
    "package.json",
    "nub.jsonc",
    "nub.lock",
    "apps/mobile/package.json",
    "apps/mobile/app.json",
    "apps/mobile/app.config.js",
    "scripts/native-prebuild.mjs",
  ];
  for (const directory of [
    "apps/mobile/assets/app-icons",
    "apps/mobile/locales",
    "apps/mobile/plugins",
    "patches",
  ]) {
    for (const entry of readdirSync(resolve(projectRoot, directory), {
      recursive: true,
      withFileTypes: true,
    })) {
      if (!entry.isFile() || /(^\.|\.test\.|\.md$)/.test(entry.name)) continue;
      inputs.push(relative(projectRoot, resolve(entry.parentPath, entry.name)));
    }
  }
  const hash = createHash("sha256");
  for (const input of inputs.sort()) {
    const path = resolve(projectRoot, input);
    hash.update(input).update("\0");
    if (existsSync(path)) hash.update(createHash("sha256").update(readFileSync(path)).digest());
    hash.update("\0");
  }
  return hash.digest("hex");
}

export function runNub(args, env = process.env) {
  const result = spawnSync("nub", args, { cwd: mobile, env, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`nub ${args.join(" ")} failed (${result.signal ?? result.status})`);
  }
}

export function prebuildNativeProject(platform, env = process.env) {
  const manifest = resolve(mobile, "package.json");
  const before = readFileSync(manifest, "utf8");
  const mobileRequire = createRequire(manifest);
  const expoManifest = "expo/package.json";
  const template = resolve(dirname(mobileRequire.resolve(expoManifest)), "template.tgz");
  let failure;
  try {
    runNub(
      [
        "exec",
        "--node",
        "sfw",
        "nub",
        "exec",
        "--node",
        "expo",
        "prebuild",
        "--platform",
        platform,
        "--template",
        template,
        "--no-install",
        "--skip-dependency-update",
        "react,react-native",
      ],
      env,
    );
  } catch (error) {
    failure = error;
  }
  if (readFileSync(manifest, "utf8") !== before) {
    writeFileSync(manifest, before);
    throw new Error(
      "Expo prebuild attempted to change the mobile manifest. Review the template and update dependencies through NUB and SFW.",
      { cause: failure },
    );
  }
  if (failure) throw failure;
}
