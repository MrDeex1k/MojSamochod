import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const digest = (contents) => createHash("sha256").update(contents).digest("hex");

function paths(projectDirectory) {
  return {
    legacy: resolve(projectDirectory, "project.pbxproj"),
    json: resolve(projectDirectory, "project.xcproj"),
    cache: resolve(projectDirectory, ".moje-auto-project-format.json"),
  };
}

export function normalizeFileReferences(references) {
  for (const reference of Object.values(references)) {
    if (typeof reference !== "object" || reference === null) continue;
    // node-xcode's unknown .icon extension emits a literal undefined encoding.
    // Xcode converts that invalid text encoding into a different integer each time.
    if (reference.path?.replaceAll('"', "").endsWith(".icon")) delete reference.fileEncoding;
    for (const key of ["explicitFileType", "lastKnownFileType"]) {
      if (reference[key] === "undefined") delete reference[key];
    }
  }
}

export function restoreLegacyProject(projectDirectory) {
  const files = paths(projectDirectory);
  if (!existsSync(files.json)) return;
  if (existsSync(files.legacy)) {
    throw new Error(
      "Both project.xcproj and project.pbxproj exist. Resolve the duplicate before preparing iOS.",
    );
  }
  const message =
    "The JSON Xcode project was edited or its compatibility cache is missing. " +
    "Preserve your native changes and move them into app config or an Expo config plugin before " +
    "regenerating ios with Expo prebuild --clean, then run nub run ios:prepare. " +
    "No project files were overwritten.";
  if (!existsSync(files.cache)) throw new Error(message);
  let cache;
  try {
    cache = JSON.parse(readFileSync(files.cache, "utf8"));
  } catch (cause) {
    throw new Error(message, { cause });
  }
  if (
    !cache ||
    cache.version !== 1 ||
    typeof cache.pbxproj !== "string" ||
    cache.jsonHash !== digest(readFileSync(files.json)) ||
    cache.pbxprojHash !== digest(cache.pbxproj)
  )
    throw new Error(message);

  // A fresh Xcode JSON → plist conversion changes UUIDs recorded by RN's SPM injector.
  // Restore the exact generator output instead, only while its JSON remains unchanged.
  writeFileSync(`${files.legacy}.tmp`, cache.pbxproj);
  renameSync(`${files.legacy}.tmp`, files.legacy);
  unlinkSync(files.json);
}

export function convertProjectToJson(projectDirectory, run = spawnSync) {
  const files = paths(projectDirectory);
  if (!existsSync(files.legacy)) {
    if (existsSync(files.json)) return;
    throw new Error("No Xcode project configuration found. Run nub run ios:prepare first.");
  }
  if (existsSync(files.json)) {
    throw new Error(
      "Both project.xcproj and project.pbxproj exist. Refusing to replace either file.",
    );
  }
  const pbxproj = readFileSync(files.legacy, "utf8");
  const result = run("xcodebuild", ["-project", projectDirectory, "-convert-project", "xcproj"], {
    encoding: "utf8",
  });
  if (result.error || result.status !== 0 || !existsSync(files.json) || existsSync(files.legacy)) {
    // Retain a usable generator input if Xcode fails partway through conversion.
    writeFileSync(files.legacy, pbxproj);
    if (existsSync(files.json)) unlinkSync(files.json);
    throw new Error(
      `Xcode JSON conversion failed. Use Xcode 27.2 or later.\n${result.error?.message ?? result.stderr ?? result.stdout ?? ""}`,
    );
  }
  writeFileSync(
    `${files.cache}.tmp`,
    JSON.stringify({
      version: 1,
      jsonHash: digest(readFileSync(files.json)),
      pbxprojHash: digest(pbxproj),
      pbxproj,
    }),
  );
  renameSync(`${files.cache}.tmp`, files.cache);
}

export function withLegacyProject(projectDirectory, action, run = spawnSync) {
  restoreLegacyProject(projectDirectory);
  try {
    return action();
  } finally {
    convertProjectToJson(projectDirectory, run);
  }
}
