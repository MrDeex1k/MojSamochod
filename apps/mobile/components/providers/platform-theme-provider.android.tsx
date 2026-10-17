import type { PropsWithChildren } from "react";
import { VariableContextProvider } from "nativewind";
import { nativeTheme } from "@/styles/native-theme";

const variables = Object.fromEntries(
  Object.entries(nativeTheme).map(([key, value]) => {
    const name =
      key === "primary" || key === "secondary"
        ? `text-${key}`
        : key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
    return [`--theme-color-${name}`, value];
  }),
);

export function PlatformThemeProvider({ children }: PropsWithChildren) {
  return <VariableContextProvider value={variables}>{children}</VariableContextProvider>;
}
