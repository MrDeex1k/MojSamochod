import { readdirSync, readFileSync, writeFileSync, rmSync, cpSync, existsSync } from "node:fs";
import { resolve, relative } from "node:path";

// Expo's precompiled core imports the source-built JSI module in its Swift interface.
// SDK 58's experimental generator currently omits that dependency from consumers.
const packages = resolve(
  import.meta.dirname,
  "../apps/mobile/ios/build/generated/autolinking/expo/expo-source",
);
const jsiPackage = resolve(packages, "expo-modules-jsi");
const frameworks = resolve(packages, "../../../../xcframeworks");
const nativeHeaders = resolve(frameworks, "ReactNativeHeadersTarget");
const headersVersion = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "../node_modules/react-native/package.json"), "utf8"),
).version;
const versionPath = resolve(nativeHeaders, ".react-native-version");
if (!existsSync(versionPath) || readFileSync(versionPath, "utf8") !== headersVersion) {
  rmSync(nativeHeaders, { recursive: true, force: true });
  cpSync(
    resolve(frameworks, "ReactNativeHeaders.xcframework/ios-arm64_x86_64-simulator/Headers"),
    resolve(nativeHeaders, "include"),
    { recursive: true },
  );
  writeFileSync(
    resolve(nativeHeaders, "empty.cpp"),
    "// Invariant React Native compile headers.\n",
  );
  writeFileSync(versionPath, headersVersion);
}
const nativeMapPath = resolve(nativeHeaders, "include/module.modulemap");
let nativeMap = readFileSync(nativeMapPath, "utf8");
if (!nativeMap.includes("module SchedulerPriority"))
  nativeMap = nativeMap.replace(
    "module ReactCommon {",
    'module ReactCommon {\n  module SchedulerPriority {\n    requires cplusplus\n    header "ReactCommon/SchedulerPriority.h"\n    export *\n  }',
  );
if (!nativeMap.includes('header "ReactCommon/CallInvoker.h"'))
  nativeMap = nativeMap.replace(
    '    header "ReactCommon/SchedulerPriority.h"',
    '    header "ReactCommon/SchedulerPriority.h"\n    header "ReactCommon/CallInvoker.h"',
  );
if (!nativeMap.includes("module Timing"))
  nativeMap = nativeMap
    .replace('  header "react/timing/primitives.h"\n', "")
    .replace(
      "module ReactNativeHeaders_react {",
      'module ReactNativeHeaders_react {\n  module Timing {\n    requires cplusplus\n    header "react/timing/primitives.h"\n    export *\n  }',
    );
writeFileSync(nativeMapPath, nativeMap);
const frameworksManifestPath = resolve(frameworks, "Package.swift");
const frameworksManifest = readFileSync(frameworksManifestPath, "utf8");
writeFileSync(
  frameworksManifestPath,
  frameworksManifest.replace(
    /\.binaryTarget\(\s*name: "ReactNativeHeaders",\s*path: "ReactNativeHeaders.xcframework"\s*\)/,
    '.target(name: "ReactNativeHeaders", path: "ReactNativeHeadersTarget", publicHeadersPath: "include")',
  ),
);
const reactModuleMap = resolve(
  packages,
  "../../../../xcframeworks/ReactHeadersTarget/include/module.modulemap",
);
const reactMap = readFileSync(reactModuleMap, "utf8");
writeFileSync(
  reactModuleMap,
  reactMap.includes("module FabricProtocol")
    ? reactMap
    : reactMap
        .replaceAll("textual header", "header")
        .replace(
          '  header "React/RCTComponentViewProtocol.h"',
          '  module FabricProtocol {\n    requires cplusplus\n    header "React/RCTComponentViewProtocol.h"\n    export *\n  }',
        )
        .replace(
          /  header "React\/(RCTComponentViewFactory|RCTComponentViewRegistry|RCTMountingManager|RCTSurfacePresenter|RCTViewComponentView)\.h"/g,
          '  textual header "React/$1.h"',
        ),
);
// The RN header collector currently includes the datetime picker's Windows target.
rmSync(resolve(packages, "../../../ios/ReactAppHeaders/RNDateTimePicker/windows"), {
  recursive: true,
  force: true,
});
const appHeaders = resolve(packages, "../../../ios/ReactAppHeaders");
const headerEntries = readdirSync(appHeaders, { recursive: true, withFileTypes: true })
  .filter((entry) => entry.name.endsWith(".h"))
  .filter(
    (entry) =>
      !/^(RNDateTimePicker|RNCMaskedView|RNGestureHandler|RNReanimated|RNScreens|RNWorklets|react-native-safe-area-context)\//.test(
        relative(appHeaders, resolve(entry.parentPath, entry.name)),
      ),
  )
  .map(
    (entry) => `  textual header "${relative(appHeaders, resolve(entry.parentPath, entry.name))}"`,
  );
// Community private headers are available for C++ includes without eagerly importing all of them.
writeFileSync(
  resolve(appHeaders, "module.modulemap"),
  `module ReactAppHeaders {\n${headerEntries.join("\n")}\n  export *\n}\n`,
);
const codegenManifest = resolve(appHeaders, "../Package.swift");
writeFileSync(
  resolve(appHeaders, "../ReactAppDependencyProvider/module.modulemap"),
  'module ReactAppDependencyProvider {\n  header "RCTAppDependencyProvider.h"\n  export *\n}\n',
);
let codegenSource = readFileSync(codegenManifest, "utf8");
if (!codegenSource.includes("// Use textual app headers")) {
  codegenSource += "\n// Use textual app headers\n";
}
if (!codegenSource.includes("// Use explicit dependency provider header"))
  codegenSource += "\n// Use explicit dependency provider header\n";
writeFileSync(codegenManifest, codegenSource);
const jsiFlags = `.unsafeFlags(["-Xfrontend", "-import-module", "-Xfrontend", "Foundation", "-Xfrontend", "-import-module", "-Xfrontend", "UIKit", "-Xcc", "-fapinotes", "-Xcc", "-fmodule-map-file=${jsiPackage}/jsi.modulemap", "-Xcc", "-iapinotes-modules", "-Xcc", "${jsiPackage}"])`;
for (const entry of readdirSync(packages, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const manifestPath = resolve(packages, entry.name, "Package.swift");
  const manifest = readFileSync(manifestPath, "utf8");
  if (entry.name === "expo-modules-jsi") {
    const headers = resolve(nativeHeaders, "include/jsi");
    const moduleMap = resolve(packages, entry.name, "jsi.modulemap");
    const notes = readFileSync(
      resolve(import.meta.dirname, "../node_modules/expo-modules-jsi/apple/APINotes/jsi.apinotes"),
      "utf8",
    );
    writeFileSync(resolve(packages, entry.name, "jsi.apinotes"), notes);
    writeFileSync(
      resolve(packages, entry.name, "ExpoModulesJSI_Cxx.apinotes"),
      notes.replace("Name: jsi", "Name: ExpoModulesJSI_Cxx"),
    );
    // Claim the same physical headers used by C++ targets so API Notes attach to JSI.
    writeFileSync(
      moduleMap,
      `module jsi {\n  header "${headers}/jsi.h"\n  header "${headers}/instrumentation.h"\n  export *\n}\n`,
    );
    writeFileSync(
      manifestPath,
      manifest
        .replace(
          '.library(name: "ExpoModulesJSI", targets:',
          '.library(name: "ExpoModulesJSI", type: .dynamic, targets:',
        )
        .replace("swiftLanguageModes: [.v5]", "swiftLanguageModes: [.v6]")
        .replaceAll(
          "swiftSettings: [",
          manifest.includes('"-enable-library-evolution"')
            ? "swiftSettings: ["
            : 'swiftSettings: [.unsafeFlags(["-enable-library-evolution"]), ',
        )
        .replace(/-fmodule-map-file=[^"]+/g, `-fmodule-map-file=${moduleMap}`)
        .replaceAll(
          resolve(import.meta.dirname, "../node_modules/expo-modules-jsi/apple/APINotes"),
          resolve(packages, entry.name),
        )
        .replaceAll(
          "swiftSettings: [",
          manifest.includes('"-fapinotes"')
            ? "swiftSettings: ["
            : 'swiftSettings: [.unsafeFlags(["-Xcc", "-fapinotes"]), ',
        )
        .replace(/\.unsafeFlags\(\["-Xcc", "-I[^"]+"\]\), /g, ""),
    );
    continue;
  }
  let consumer = manifest.includes(".interoperabilityMode(.Cxx)")
    ? manifest
    : manifest.replaceAll(
        "swiftSettings: [",
        `swiftSettings: [.interoperabilityMode(.Cxx), ${jsiFlags}, `,
      );
  if (!consumer.includes('"-import-module"'))
    consumer = consumer.replaceAll(
      "swiftSettings: [",
      'swiftSettings: [.unsafeFlags(["-Xfrontend", "-import-module", "-Xfrontend", "Foundation", "-Xfrontend", "-import-module", "-Xfrontend", "UIKit"]), ',
    );
  if (entry.name === "ExpoSQLite")
    consumer = consumer.replace('exclude: ["Tests"]', 'exclude: ["Tests", "Benchmarks"]');
  if (entry.name === "ExpoNotifications" && !consumer.includes('"EXPO_SWIFTPM_CXX"'))
    consumer = consumer.replaceAll(
      "swiftSettings: [",
      'swiftSettings: [.define("EXPO_SWIFTPM_CXX"), ',
    );
  if (entry.name === "ExpoRouter" && !consumer.includes('.package(name: "RNScreens"')) {
    consumer = consumer
      .replace(
        "    dependencies: [",
        '    dependencies: [\n        .package(name: "RNScreens", path: "../../../libs/RNScreens"),',
      )
      .replaceAll(
        "            dependencies: [",
        '            dependencies: [\n                .product(name: "RNScreens", package: "RNScreens"),',
      );
  }
  if (entry.name === "ExpoRouter" && !consumer.includes("screens-header-paths")) {
    const screensRoot = resolve(import.meta.dirname, "../node_modules/react-native-screens");
    const screensManifest = readFileSync(resolve(screensRoot, "Package.swift"), "utf8");
    const directories = [
      ...new Set(
        [...screensManifest.matchAll(/\.headerSearchPath\("([^"]+)"\)/g)].map((match) =>
          resolve(screensRoot, match[1]),
        ),
      ),
    ];
    const flags = directories.flatMap((directory) => ["-Xcc", `-I${directory}`]);
    consumer = consumer.replaceAll(
      "swiftSettings: [",
      `swiftSettings: [/* screens-header-paths */ .unsafeFlags(${JSON.stringify(flags)}), `,
    );
  }
  if (manifest.includes('.package(name: "expo-modules-jsi"')) {
    writeFileSync(manifestPath, consumer);
    continue;
  }
  const patched = consumer
    .replace(
      "    dependencies: [",
      '    dependencies: [\n        .package(name: "expo-modules-jsi", path: "../expo-modules-jsi"),',
    )
    .replaceAll(
      "            dependencies: [",
      '            dependencies: [\n                .product(name: "ExpoModulesJSI", package: "expo-modules-jsi"),',
    );
  writeFileSync(manifestPath, patched);
}
