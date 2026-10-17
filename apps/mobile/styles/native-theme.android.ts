import { getMaterialColors } from "@expo/ui/jetpack-compose";
import { materialSeed } from "./native-theme.shared";

export { materialSeed } from "./native-theme.shared";
export const materialColors = getMaterialColors({ scheme: "dark", seedColor: materialSeed });
export const nativeTheme = {
  canvas: "#010101",
  surface: materialColors.surfaceContainer,
  surfaceStrong: materialColors.surfaceContainerHigh,
  surfaceMuted: materialColors.surfaceContainerLow,
  primary: materialColors.onSurface,
  secondary: materialColors.onSurfaceVariant,
  accent: materialColors.primary,
  accentPressed: materialColors.primaryContainer,
  onAccent: materialColors.onPrimary,
  divider: materialColors.outlineVariant,
  danger: materialColors.error,
  warning: materialColors.tertiary,
  success: materialColors.primary,
} as const;
