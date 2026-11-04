/** @jest-environment node */

import { execFileSync } from "node:child_process";
import { copyFileSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

it("generates the scene lifecycle required to launch on iOS 27", () => {
  const mobile = join(__dirname, "..");
  const project = mkdtempSync(join(tmpdir(), "moje-auto-scenes-"));
  const expo = dirname(require.resolve("expo/package.json"));
  try {
    for (const file of ["app.json", "app.config.js", "package.json"]) {
      copyFileSync(join(mobile, file), join(project, file));
    }
    for (const dir of ["assets", "locales", "plugins"]) {
      symlinkSync(join(mobile, dir), join(project, dir), "dir");
    }
    symlinkSync(dirname(expo), join(project, "node_modules"), "dir");

    // SceneDelegate and the base Info.plist come from the SDK template during prebuild.
    execFileSync(
      "nub",
      [
        "exec",
        "expo",
        "prebuild",
        project,
        "--platform",
        "ios",
        "--template",
        join(expo, "template.tgz"),
        "--no-install",
      ],
      {
        cwd: mobile,
        env: { ...process.env, CI: "1", EXPO_OFFLINE: "1" },
        timeout: 60_000,
      },
    );
    const plugins = require.resolve("@expo/config-plugins/package.json", { paths: [expo] });
    const plist = createRequire(plugins)("@expo/plist").default;
    const info = plist.parse(readFileSync(join(project, "ios/MojeAuto/Info.plist"), "utf8"));
    expect(info.UIApplicationSceneManifest).toMatchObject({
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: expect.arrayContaining([
          expect.objectContaining({
            UISceneDelegateClassName: "$(PRODUCT_MODULE_NAME).SceneDelegate",
          }),
        ]),
      },
    });
    expect(readFileSync(join(project, "ios/MojeAuto/SceneDelegate.swift"), "utf8")).toContain(
      "class SceneDelegate: ExpoAppSceneDelegate",
    );
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
});
