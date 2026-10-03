import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve, relative } from "node:path";

const root = resolve(import.meta.dirname, "..");
const mobile = resolve(root, "apps/mobile");
const stamp = resolve(mobile, "ios/build/generated/autolinking/.moje-auto-spm-inputs");
const inputs = [
  "package.json",
  "nub.lock",
  "nub.jsonc",
  "apps/mobile/package.json",
  "apps/mobile/app.json",
  "apps/mobile/app.config.js",
  "scripts/prepare-ios-spm.mjs",
  "scripts/wire-expo-spm.mjs",
  "scripts/check-ios-spm.mjs",
];
for (const directory of ["patches", "apps/mobile/plugins", "apps/mobile/modules"]) {
  for (const entry of readdirSync(resolve(root, directory), {
    recursive: true,
    withFileTypes: true,
  })) {
    if (!entry.isFile()) continue;
    const path = relative(root, resolve(entry.parentPath, entry.name));
    if (/(^|\/)(\.build|build|node_modules)\//.test(path)) continue;
    inputs.push(path);
  }
}
const hash = createHash("sha256");
for (const input of [...new Set(inputs)].sort()) {
  hash.update(input);
  hash.update(existsSync(resolve(root, input)) ? readFileSync(resolve(root, input)) : "missing");
}
const fingerprint = hash.digest("hex");
if (process.argv.includes("--record")) {
  writeFileSync(stamp, fingerprint);
} else if (!existsSync(stamp) || readFileSync(stamp, "utf8") !== fingerprint) {
  console.error(
    "error: SwiftPM inputs changed. Run nub run ios:prepare in apps/mobile before building in Xcode.",
  );
  process.exitCode = 1;
}
