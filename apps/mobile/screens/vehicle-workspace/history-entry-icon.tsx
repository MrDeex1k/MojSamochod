import { Text, View } from "react-native";
import { Image } from "@/components/ui/image";
import type { HistoryEntry } from "@/domain/history/history-entry";

const symbols = {
  replacement: { color: "#72b48e", path: "M4 8h15m-4-4 4 4-4 4M20 16H5m4-4-4 4 4 4" },
  repair: {
    color: "#a6bcea",
    path: "M14 6a5 5 0 0 0-6 6L3 17a2.8 2.8 0 0 0 4 4l5-5a5 5 0 0 0 6-6l-3 3-4-4 3-3Z",
  },
  inspection: { color: "#d4bc83", path: "M9 4H6v17h13V4h-3M9 3h7v4H9ZM9 14l2 2 5-5" },
} satisfies Record<HistoryEntry["type"], { color: string; path: string }>;

function iconSource(path: string, color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></svg>`;
  return { uri: `data:image/svg+xml;base64,${btoa(svg)}` };
}

export function HistoryEntryIcon({ type }: Readonly<{ type: HistoryEntry["type"] }>) {
  const symbol = symbols[type];
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: `${symbol.color}18`,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Image source={iconSource(symbol.path, symbol.color)} style={{ width: 20, height: 20 }} />
    </View>
  );
}

export function AttachmentIndicator({ count }: Readonly<{ count: number }>) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="flex-row items-center gap-compact"
    >
      <Image
        source={iconSource(
          "m21 11-9 9a6 6 0 0 1-8.5-8.5l9-9a4 4 0 0 1 5.7 5.7l-9 9a2 2 0 0 1-2.8-2.8l8.5-8.5",
          "#aab0a7",
        )}
        style={{ width: 16, height: 16 }}
      />
      <Text className="text-caption text-secondary">{count}</Text>
    </View>
  );
}
