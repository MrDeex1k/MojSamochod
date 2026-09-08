/** @jest-environment node */

import { execFileSync } from "node:child_process";
import { join } from "node:path";

jest.mock("expo/config-plugins", () => ({
  withEntitlementsPlist: (config: unknown, action: (value: unknown) => unknown) => action(config),
}));

const withLocalOnlyNotifications = require("./with-local-only-notifications.cjs");

describe("local-only notification configuration", () => {
  it("keeps the final Expo configuration local-only after all plugins run", () => {
    const output = execFileSync(
      "nub",
      ["exec", "expo", "config", "--type", "introspect", "--json"],
      {
        cwd: join(__dirname, ".."),
        encoding: "utf8",
        timeout: 20_000,
      },
    );
    const config = JSON.parse(output);
    const native = config._internal.modResults;
    expect(native.ios.entitlements["aps-environment"]).toBeUndefined();
    expect(native.ios.infoPlist.UIBackgroundModes ?? []).not.toContain("remote-notification");
    expect(native.ios.infoPlist.NSCameraUsageDescription).toBeUndefined();
    expect(native.ios.infoPlist.NSMicrophoneUsageDescription).toBeUndefined();
    expect(native.ios.infoPlist.NSPhotoLibraryUsageDescription).toBeTruthy();
    const manifestPermissions = native.android.manifest.manifest["uses-permission"];
    for (const name of [
      "CAMERA",
      "RECORD_AUDIO",
      "READ_EXTERNAL_STORAGE",
      "WRITE_EXTERNAL_STORAGE",
      "READ_MEDIA_IMAGES",
      "READ_MEDIA_VIDEO",
      "READ_MEDIA_AUDIO",
      "READ_MEDIA_VISUAL_USER_SELECTED",
    ]) {
      const permission = manifestPermissions.find(
        (entry: { $: Record<string, string> }) =>
          entry.$["android:name"] === `android.permission.${name}`,
      );
      expect(permission?.$["tools:node"]).toBe("remove");
    }
    for (const name of [
      "android.permission.SYSTEM_ALERT_WINDOW",
      "com.google.android.c2dm.permission.RECEIVE",
      "com.google.android.finsky.permission.BIND_GET_INSTALL_REFERRER_SERVICE",
    ]) {
      expect(
        manifestPermissions.find(
          (entry: { $: Record<string, string> }) => entry.$["android:name"] === name,
        )?.$["tools:node"],
      ).toBe("remove");
    }
    const permissions = native.android.manifest.manifest["uses-permission"].map(
      (permission: { $: { "android:name": string } }) => permission.$["android:name"],
    );
    expect(permissions).not.toContain("android.permission.SCHEDULE_EXACT_ALARM");
    expect(permissions).not.toContain("android.permission.USE_EXACT_ALARM");
  });
  it("removes the push entitlement without altering unrelated signing capabilities", () => {
    const config = {
      modResults: {
        "aps-environment": "development",
        "com.apple.developer.associated-domains": ["applinks:example.com"],
      },
    };
    expect(withLocalOnlyNotifications(config)).toEqual({
      modResults: { "com.apple.developer.associated-domains": ["applinks:example.com"] },
    });
  });
  it("is safe to reapply when the push entitlement is absent", () => {
    const config = { modResults: {} };
    expect(withLocalOnlyNotifications(withLocalOnlyNotifications(config))).toEqual(config);
  });
});
