import { useState, type ReactNode } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { ScreenFrame } from "./screen-frame";
import { fitsWorkspaceList } from "./window-layout";

export function AdaptiveWorkspace({ children, list }: { children: ReactNode; list?: ReactNode }) {
  const { height, width, fontScale } = useWindowDimensions();
  const [availableWidth, setAvailableWidth] = useState<number | null>(null);
  const contentWidth = Math.min(width, availableWidth ?? width);
  const split = Boolean(list) && fitsWorkspaceList(contentWidth, height, fontScale);

  return (
    <ScreenFrame>
      <View
        style={[styles.workspace, split && styles.split]}
        onLayout={(event) => setAvailableWidth(event.nativeEvent.layout.width)}
      >
        {split ? <View style={styles.pane}>{list}</View> : null}
        <View style={styles.pane}>{children}</View>
      </View>
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  workspace: { flex: 1, flexDirection: "row" },
  split: { paddingHorizontal: 16, gap: 16 },
  pane: { flex: 1, minWidth: 0 },
});
