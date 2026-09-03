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
