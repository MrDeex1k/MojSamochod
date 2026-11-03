import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, existsSync, rmSync, writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { test } from "node:test";
import {
  convertProjectToJson,
  normalizeFileReferences,
  restoreLegacyProject,
  withLegacyProject,
} from "./xcode-project-format.mjs";

const legacy = "// PBX fixture: stable SPM IDs 83CBB9F7 / 13B07F86\n";
const json = '{ "targets": [{ "name": "App" }], }\n';

test("removes invalid icon encoding and unknown type placeholders without changing valid text encodings", () => {
  const icon = {
    path: '"MojeAuto/Car.icon"',
    fileEncoding: "undefined",
    explicitFileType: "undefined",
  };
  const text = { path: "Info.plist", fileEncoding: 4, lastKnownFileType: "text.plist.xml" };
  normalizeFileReferences({ ICON: icon, ICON_comment: "Car.icon", TEXT: text });
  assert.deepEqual(icon, { path: '"MojeAuto/Car.icon"' });
  assert.deepEqual(text, {
    path: "Info.plist",
    fileEncoding: 4,
    lastKnownFileType: "text.plist.xml",
  });
});

function fixture(t) {
  const directory = mkdtempSync(resolve(tmpdir(), "moje-auto-xcproj-test-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const pbx = resolve(directory, "project.pbxproj");
  const xcproj = resolve(directory, "project.xcproj");
  const cache = resolve(directory, ".moje-auto-project-format.json");
  writeFileSync(pbx, legacy);
  const converter = (command, args) => {
    assert.equal(command, "xcodebuild");
    assert.deepEqual(args, ["-project", directory, "-convert-project", "xcproj"]);
    unlinkSync(pbx);
    writeFileSync(xcproj, json);
    return { status: 0 };
  };
  return { directory, pbx, xcproj, cache, converter };
}

test("converts through Xcode and preserves the exact SPM generator identifiers for repeated preparation", (t) => {
  const f = fixture(t);
  for (let pass = 0; pass < 2; pass++) {
    convertProjectToJson(f.directory, f.converter);
    assert.equal(existsSync(f.pbx), false);
    assert.equal(readFileSync(f.xcproj, "utf8"), json);
    restoreLegacyProject(f.directory);
    assert.equal(readFileSync(f.pbx, "utf8"), legacy);
    assert.equal(existsSync(f.xcproj), false);
  }
});

test("does not overwrite an edited JSON project", (t) => {
  const f = fixture(t);
  convertProjectToJson(f.directory, f.converter);
  const edited = json + "\n";
  writeFileSync(f.xcproj, edited);
  assert.throws(() => restoreLegacyProject(f.directory), /Preserve your native changes/);
  assert.equal(readFileSync(f.xcproj, "utf8"), edited);
  assert.equal(existsSync(f.pbx), false);
});

test("does not restore a missing or tampered compatibility cache", (t) => {
  const f = fixture(t);
  convertProjectToJson(f.directory, f.converter);
  const cache = JSON.parse(readFileSync(f.cache, "utf8"));
  cache.pbxproj += "tampered";
  writeFileSync(f.cache, JSON.stringify(cache));
  assert.throws(() => restoreLegacyProject(f.directory), /No project files were overwritten/);
  unlinkSync(f.cache);
  assert.throws(() => restoreLegacyProject(f.directory), /compatibility cache is missing/);
  assert.equal(existsSync(f.pbx), false);
});

test("refuses to choose silently between two project formats", (t) => {
  const f = fixture(t);
  writeFileSync(f.xcproj, json);
  assert.throws(
    () => restoreLegacyProject(f.directory),
    /Both project.xcproj and project.pbxproj exist/,
  );
  assert.throws(() => convertProjectToJson(f.directory, f.converter), /Refusing to replace/);
  assert.equal(readFileSync(f.pbx, "utf8"), legacy);
  assert.equal(readFileSync(f.xcproj, "utf8"), json);
});

test("retains a usable plist if Xcode conversion fails partway through", (t) => {
  const f = fixture(t);
  const failure = () => {
    unlinkSync(f.pbx);
    writeFileSync(f.xcproj, "partial");
    return { status: 65, stderr: "Unsupported project format" };
  };
  assert.throws(() => convertProjectToJson(f.directory, failure), /Unsupported project format/);
  assert.equal(readFileSync(f.pbx, "utf8"), legacy);
  assert.equal(existsSync(f.xcproj), false);
});

test("always returns to JSON after a failed Expo command, retaining its changes and exit status", (t) => {
  const f = fixture(t);
  convertProjectToJson(f.directory, f.converter);
  const status = withLegacyProject(
    f.directory,
    () => {
      assert.equal(existsSync(f.xcproj), false);
      writeFileSync(f.pbx, legacy + "signing update\n");
      return 65;
    },
    f.converter,
  );
  assert.equal(status, 65);
  assert.equal(existsSync(f.pbx), false);
  restoreLegacyProject(f.directory);
  assert.equal(readFileSync(f.pbx, "utf8"), legacy + "signing update\n");
});

test("returns to JSON when a legacy command throws", (t) => {
  const f = fixture(t);
  convertProjectToJson(f.directory, f.converter);
  assert.throws(
    () =>
      withLegacyProject(
        f.directory,
        () => {
          throw new Error("Expo could not start");
        },
        f.converter,
      ),
    /Expo could not start/,
  );
  assert.equal(existsSync(f.xcproj), true);
  assert.equal(existsSync(f.pbx), false);
});
