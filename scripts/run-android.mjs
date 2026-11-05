import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  mobile,
  nativeConfigFingerprint,
  prebuildNativeProject,
  runNub,
} from "./native-prebuild.mjs";

const qa = process.env.MOJE_AUTO_NATIVE_QA === "1";
const config = JSON.parse(readFileSync(resolve(mobile, "app.json"), "utf8"));
const expectedId = qa ? "dev.mojeauto.qa" : config.expo.android.package;
const stamp = resolve(mobile, "android/.moje-auto-native-config");
const gradle = resolve(mobile, "android/app/build.gradle");
const appId = () =>
  existsSync(gradle)
    ? /^\s*applicationId\s+['"]([^'"]+)['"]/m.exec(readFileSync(gradle, "utf8"))?.[1]
    : undefined;
const fingerprint = `${expectedId}:${nativeConfigFingerprint()}`;
if (!existsSync(stamp) || readFileSync(stamp, "utf8") !== fingerprint || appId() !== expectedId) {
  rmSync(stamp, { force: true });
  prebuildNativeProject("android");
  if (appId() !== expectedId) {
    throw new Error(`Android prebuild did not produce the requested application ID ${expectedId}.`);
  }
  writeFileSync(stamp, fingerprint);
}

const args = process.argv.slice(2);
if (!args.includes("--prepare")) {
  runNub([
    "exec",
    "--node",
    "sfw",
    "nub",
    "exec",
    "--node",
    "expo",
    "run:android",
    "--no-install",
    ...args,
  ]);
}
