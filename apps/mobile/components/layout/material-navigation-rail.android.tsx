import { requireNativeView } from "expo";
import { useWindowDimensions, type ViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { materialColors } from "@/styles/native-theme.android";
const NativeRail = requireNativeView<
  ViewProps & {
    labels: string[];
    selectedIndex: number;
    palette: string[];
    onSelect: (event: { nativeEvent: { index: number } }) => void;
  }
>("MaterialNavigation");
const palette = [
  materialColors.surfaceContainer,
  materialColors.secondaryContainer,
  materialColors.onSecondaryContainer,
  materialColors.primary,
  materialColors.onSurfaceVariant,
];
export function MaterialNavigationRail({
  labels,
  selectedIndex,
  onSelect,
}: {
  labels: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  const { fontScale } = useWindowDimensions();
  return (
    <SafeAreaView
      edges={["top", "bottom", "left"]}
      style={{
        width: Math.min(160, Math.round(96 * fontScale)),
        backgroundColor: materialColors.surfaceContainer,
      }}
    >
      <NativeRail
        labels={labels}
        selectedIndex={selectedIndex}
        palette={palette}
        onSelect={(event) => onSelect(event.nativeEvent.index)}
        style={{ flex: 1 }}
      />
    </SafeAreaView>
  );
}
