import type { PropsWithChildren } from "react";
import { VariableContextProvider } from "nativewind";
import { nativeTheme } from "@/styles/native-theme";

const colors = Object.fromEntries(
  Object.entries(nativeTheme).map(([key, value]) => {
    const name =
      key === "primary" || key === "secondary"
        ? `text-${key}`
        : key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
    return [`--theme-color-${name}`, value];
  }),
);

const variables = {
  ...colors,
  "--text-title": 22,
  "--text-title--line-height": 1.272727,
  "--text-heading": 20,
  "--text-heading--line-height": 1.4,
  "--text-label": 14,
  "--text-label--line-height": 1.428571,
  "--radius-panel": 20,
  "--radius-control": 12,
  "--radius-compact": 12,
};

export function PlatformThemeProvider({ children }: PropsWithChildren) {
  return <VariableContextProvider value={variables}>{children}</VariableContextProvider>;
}
