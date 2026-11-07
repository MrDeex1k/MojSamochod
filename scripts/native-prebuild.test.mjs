import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { nativeConfigFingerprint } from "./native-prebuild.mjs";

test("native preparation tracks localized resources, icons, runtime plugins and the lockfile", (t) => {
  const root = mkdtempSync(resolve(tmpdir(), "moje-auto-native-inputs-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const inputs = [
    "apps/mobile/locales/pl.json",
    "apps/mobile/assets/app-icons/Car.icon/icon.json",
    "apps/mobile/plugins/plugin.cjs",
    "patches/dependency.patch",
    "nub.lock",
  ];
  for (const input of inputs) {
    const path = resolve(root, input);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, "initial");
  }
  for (const input of inputs) {
    const before = nativeConfigFingerprint(root);
    writeFileSync(resolve(root, input), "changed");
    assert.notEqual(nativeConfigFingerprint(root), before, input);
  }
  const before = nativeConfigFingerprint(root);
  writeFileSync(resolve(root, "apps/mobile/plugins/plugin.test.ts"), "test-only");
  assert.equal(nativeConfigFingerprint(root), before);
});
