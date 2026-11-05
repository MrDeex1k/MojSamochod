import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import {
  convertProjectToJson,
  normalizeFileReferences,
  withLegacyProject,
} from "./xcode-project-format.mjs";
import {
  mobile,
  nativeConfigFingerprint,
  prebuildNativeProject,
  runNub,
} from "./native-prebuild.mjs";

const projectDirectory = resolve(mobile, "ios/MojeAuto.xcodeproj");
const env = {
  ...process.env,
  RCT_SPM_AUTOLINKING_CONFIG_COMMAND: JSON.stringify([
    "nub",
    "exec",
    "--node",
    "expo-modules-autolinking",
    "react-native-config",
    "--json",
    "--platform",
    "ios",
  ]),
};
const run = (args) => runNub(args, env);

const nativeConfigStamp = resolve(mobile, "ios/.moje-auto-native-config");
const nativeConfig = `${env.MOJE_AUTO_NATIVE_QA === "1" ? "qa" : "production"}:${nativeConfigFingerprint()}`;
const prebuild =
  !existsSync(nativeConfigStamp) || readFileSync(nativeConfigStamp, "utf8") !== nativeConfig;
const projectPath = resolve(projectDirectory, "project.pbxproj");
if (existsSync(resolve(projectDirectory, "project.xcproj")) || existsSync(projectPath)) {
  withLegacyProject(projectDirectory, prepareSwiftPM);
} else {
  prepareSwiftPM();
  convertProjectToJson(projectDirectory);
}
run(["--node", resolve(import.meta.dirname, "check-ios-spm.mjs"), "--record"]);
writeFileSync(nativeConfigStamp, nativeConfig);

function prepareSwiftPM() {
  rmSync(nativeConfigStamp, { force: true });
  rmSync(resolve(mobile, "ios/build/generated/autolinking/.moje-auto-spm-inputs"), { force: true });
  if (prebuild || !existsSync(projectPath)) {
    prebuildNativeProject("ios", env);
  }
  const installed = existsSync(resolve(projectDirectory, ".spm-injected.json"));
  run([
    "exec",
    "--node",
    "sfw",
    "nub",
    "exec",
    "--node",
    "react-native",
    "spm",
    installed ? "update" : "add",
    ...(!installed || prebuild ? ["--deintegrate"] : []),
    "--yes",
  ]);
  run(["--node", resolve(import.meta.dirname, "wire-expo-spm.mjs")]);

  // SDK 58's automatic sync would discard the consumption fixes before graph resolution.
  // Keep both Xcode entry points deterministic and require an explicit NUB preparation.
  const require = createRequire(resolve(mobile, "package.json"));
  const project = require("xcode").project(projectPath);
  project.parseSync();
  normalizeFileReferences(project.pbxFileReferenceSection());
  const generated = resolve(mobile, "ios/build/generated/autolinking");
  const jsi = resolve(generated, "expo/expo-source/expo-modules-jsi");
  const screens = resolve(mobile, "../../node_modules/react-native-screens");
  const screenIncludes = [
    ...new Set(
      [
        ...readFileSync(resolve(screens, "Package.swift"), "utf8").matchAll(
          /\.headerSearchPath\("([^"]+)"\)/g,
        ),
      ].map((match) => resolve(screens, match[1])),
    ),
  ];
  const swiftFlags = [
    "$(inherited)",
    "-F",
    resolve(generated, "expo/compile-interfaces"),
    "-cxx-interoperability-mode=default",
    "-Xfrontend",
    "-import-module",
    "-Xfrontend",
    "Foundation",
    "-Xfrontend",
    "-import-module",
    "-Xfrontend",
    "UIKit",
    "-Xfrontend",
    "-import-module",
    "-Xfrontend",
    "React_RCTAppDelegate",
    "-Xcc",
    "-std=c++20",
    "-Xcc",
    "-fapinotes",
    "-Xcc",
    `-fmodule-map-file=${jsi}/jsi.modulemap`,
    "-Xcc",
    "-iapinotes-modules",
    "-Xcc",
    jsi,
    ...screenIncludes.flatMap((path) => ["-Xcc", `-I${path}`]),
  ];
  for (const configuration of Object.values(project.pbxXCBuildConfigurationSection())) {
    if (typeof configuration === "object" && configuration.buildSettings?.SWIFT_VERSION) {
      configuration.buildSettings.OTHER_SWIFT_FLAGS = swiftFlags.map((flag) =>
        JSON.stringify(flag),
      );
      configuration.buildSettings.SWIFT_VERSION = "5.0";
      // The Expo template's empty bridging header creates a second import context.
      delete configuration.buildSettings.SWIFT_OBJC_BRIDGING_HEADER;
    }
  }
  const nubPath = spawnSync("which", ["nub"], { encoding: "utf8" }).stdout.trim();
  if (!nubPath) throw new Error("NUB executable was not found");
  const command = `set -e\ncd "$SRCROOT/.."\n${JSON.stringify(nubPath)} --node ../../scripts/check-ios-spm.mjs\n`;
  for (const phase of Object.values(project.hash.project.objects.PBXShellScriptBuildPhase)) {
    if (typeof phase === "object" && phase.name === '"Sync SPM Autolinking"') {
      phase.shellScript = JSON.stringify(command);
    }
  }
  writeFileSync(projectPath, project.writeSync());
  const schemePath = resolve(
    mobile,
    "ios/MojeAuto.xcodeproj/xcshareddata/xcschemes/MojeAuto.xcscheme",
  );
  const xmlCommand = command.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
  writeFileSync(
    schemePath,
    readFileSync(schemePath, "utf8").replace(
      /(title = "Sync SPM Autolinking"\s+scriptText = ")[\s\S]*?("\s*>)/,
      `$1${xmlCommand}$2`,
    ),
  );
  writeFileSync(
    resolve(mobile, "ios/.xcode.env"),
    `# Generated by NUB SwiftPM preparation.\nexport NODE_BINARY=${JSON.stringify(process.execPath)}\nexport RCT_SPM_AUTOLINKING_CONFIG_COMMAND='${env.RCT_SPM_AUTOLINKING_CONFIG_COMMAND}'\n`,
  );
}
