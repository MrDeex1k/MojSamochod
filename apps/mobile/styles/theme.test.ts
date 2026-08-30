import { readFileSync } from "node:fs";

describe("native theme typography", () => {
  it("keeps custom line heights unitless for React Native CSS", () => {
    const theme = readFileSync(__filename.replace(".test.ts", ".css"), "utf8");
    const lineHeights = [...theme.matchAll(/--text-[\w-]+--line-height:\s*([^;]+);/g)].map(
      (match) => match[1]?.trim(),
    );

    expect(lineHeights).toHaveLength(6);
    expect(lineHeights).toEqual(lineHeights.map((value) => String(Number(value))));
  });
});
