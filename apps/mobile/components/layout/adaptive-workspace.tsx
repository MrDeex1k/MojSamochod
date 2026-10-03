import { resolveWindowLayout } from "./window-layout";
import { nativeTheme } from "@/styles/native-theme";
import { useState, type ReactNode } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { ScreenFrame } from "./screen-frame";

type AdaptiveWorkspaceProps = {
  detailPane?: ReactNode;
  phone: ReactNode;
  primaryPane: ReactNode;
};

type TabletWorkspaceProps = Omit<AdaptiveWorkspaceProps, "phone">;

export function AdaptiveWorkspace({ detailPane, phone, primaryPane }: AdaptiveWorkspaceProps) {
  const { height, width } = useWindowDimensions();
  const [availableWidth, setAvailableWidth] = useState<number | null>(null);
  const contentWidth = Math.min(width, availableWidth ?? width);
  const layout = resolveWindowLayout(contentWidth, height);

  const isPhone = layout.startsWith("phone");
  return (
    <ScreenFrame>
      <View
        style={{ flex: 1 }}
        onLayout={(event) => setAvailableWidth(event.nativeEvent.layout.width)}
      >
        {isPhone ? (
          phone
        ) : (
          <TabletWorkspace
            detailPane={detailPane}
            primaryPane={primaryPane}
            availableWidth={contentWidth}
          />
        )}
      </View>
    </ScreenFrame>
  );
}

export function TabletWorkspace({
  detailPane,
  primaryPane,
  availableWidth,
}: TabletWorkspaceProps & { availableWidth?: number }) {
  const { width, fontScale } = useWindowDimensions();
  const compactDetail =
    Boolean(detailPane) && (availableWidth ?? width) < Math.max(880, 720 * fontScale);
  return (
    <View style={styles.safeArea} testID="tablet-workspace">
      <View style={styles.workspace}>
        <View
          style={[styles.contentPane, compactDetail && { display: "none" }]}
          accessibilityElementsHidden={compactDetail}
          importantForAccessibility={compactDetail ? "no-hide-descendants" : "auto"}
        >
          {primaryPane}
        </View>
        {detailPane ? <View style={styles.contentPane}>{detailPane}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: nativeTheme.canvas,
    padding: 16,
  },
  workspace: {
    flex: 1,
    flexDirection: "row",
    gap: 16,
  },
  contentPane: {
    flex: 1,
    minWidth: 0,
  },
});
