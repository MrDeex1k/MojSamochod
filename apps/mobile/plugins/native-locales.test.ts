/** @jest-environment node */

import { join } from "node:path";
import { createRequire } from "node:module";
import app from "../app.json";

// Exercise the resolver from Expo's own dependency graph, not a separately pinned plugin version.
const expoRequire = createRequire(require.resolve("expo/package.json"));
const { getResolvedLocalesAsync } = expoRequire("@expo/config-plugins/build/utils/locales");

describe("native metadata locales", () => {
  it("resolves only Android resource keys on Android", async () => {
    const { localesMap } = await getResolvedLocalesAsync(
      join(__dirname, ".."),
      app.expo.locales,
      "android",
    );
    expect(localesMap).toEqual({ en: { app_name: "My Car" }, pl: { app_name: "Moje Auto" } });
  });

  it("retains localized Apple display names and photo permission descriptions", async () => {
    const { localesMap } = await getResolvedLocalesAsync(
      join(__dirname, ".."),
      app.expo.locales,
      "ios",
    );
    expect(localesMap.en.CFBundleDisplayName).toBe("My Car");
    expect(localesMap.pl.CFBundleDisplayName).toBe("Moje Auto");
    for (const locale of Object.values(localesMap) as Record<string, string>[]) {
      expect(locale.NSPhotoLibraryUsageDescription).toBeTruthy();
      expect(locale.app_name).toBeUndefined();
    }
  });
});
