import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { runInNewContext } from "node:vm";

describe("React Native CSS runtime compatibility", () => {
  it.each(["module", "commonjs"])(
    "forwards the RN 0.88 asset registry in its %s wrapper",
    (format) => {
      const root = resolve(dirname(require.resolve("react-native-css")), "../..");
      const source = readFileSync(resolve(root, `dist/${format}/components/index.cjs`), "utf8");
      const registry = { getAssetByID: jest.fn(), registerAsset: jest.fn() };
      const runtime = { exports: {} as { AssetRegistry?: typeof registry } };
      runInNewContext(source, {
        module: runtime,
        require: (name: string) => {
          if (name === "react-native") return { AssetRegistry: registry };
          throw new Error(`Unexpected eager import: ${name}`);
        },
      });
      expect(runtime.exports.AssetRegistry).toBe(registry);
    },
  );
});
