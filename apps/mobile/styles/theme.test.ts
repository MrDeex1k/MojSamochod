import { nativeTheme } from "./native-theme";
import { readFileSync } from "node:fs";

describe("native theme typography", () => {
  it("gives single-line inputs a scalable font size without a forced line height", () => {
    const theme = readFileSync(__filename.replace(".test.ts", ".css"), "utf8");
    expect(theme).toMatch(/--text-input:\s*[\d.]+rem;/);
    expect(theme).not.toContain("--text-input--line-height");
  });
  it("keeps custom line heights unitless for React Native CSS", () => {
    const theme = readFileSync(__filename.replace(".test.ts", ".css"), "utf8");
    const lineHeights = [...theme.matchAll(/--text-[\w-]+--line-height:\s*([^;]+);/g)].map(
      (match) => match[1]?.trim(),
    );

    expect(lineHeights).toHaveLength(6);
    expect(lineHeights).toEqual(lineHeights.map((value) => String(Number(value))));
  });
});

it("keeps the native control palette aligned with semantic CSS colors", () => {
  const css = readFileSync(__filename.replace(".test.ts", ".css"), "utf8");
  for (const [key, value] of Object.entries(nativeTheme)) {
    const semantic =
      key === "primary" || key === "secondary"
        ? `text-${key}`
        : key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
    const palette = css.match(new RegExp(`--theme-color-${semantic}: var\\((--[\\w-]+)\\)`))?.[1];
    expect(palette).toBeDefined();
    expect(css).toContain(`${palette}: ${value};`);
  }
});
