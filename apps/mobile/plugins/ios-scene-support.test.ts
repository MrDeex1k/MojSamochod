/** @jest-environment node */

import { execFileSync } from "node:child_process";
import { join } from "node:path";

it("generates the scene lifecycle required to launch on iOS 27", () => {
  const output = execFileSync("nub", ["exec", "expo", "config", "--type", "introspect", "--json"], {
    cwd: join(__dirname, ".."),
    encoding: "utf8",
    timeout: 20_000,
  });
  const ios = JSON.parse(output)._internal.modResults.ios;
  const scenes = ios.infoPlist.UIApplicationSceneManifest;
  expect(scenes).toBeDefined();
  expect(scenes.UIApplicationSupportsMultipleScenes).toBe(false);
  expect(scenes.UISceneConfigurations.UIWindowSceneSessionRoleApplication).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ UISceneDelegateClassName: "$(PRODUCT_MODULE_NAME).SceneDelegate" }),
    ]),
  );
});
