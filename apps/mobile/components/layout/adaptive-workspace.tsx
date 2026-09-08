import type { ReactNode } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { ScreenFrame } from "./screen-frame";
import Animated, { FadeIn, LinearTransition, ReduceMotion } from "react-native-reanimated";

const TABLET_MIN_SHORTEST_SIDE = 600;

export type WindowLayout =
  | "phone-landscape"
  | "phone-portrait"
  | "tablet-landscape"
  | "tablet-portrait";

type AdaptiveWorkspaceProps = {
  detailPane?: ReactNode;
  phone: ReactNode;
  primaryPane: ReactNode;
  vehiclePane: ReactNode;
};

type TabletWorkspaceProps = Omit<AdaptiveWorkspaceProps, "phone">;

export function resolveWindowLayout(width: number, height: number): WindowLayout {
  const isTablet = Math.min(width, height) >= TABLET_MIN_SHORTEST_SIDE;
  const isLandscape = width >= height;

  if (isTablet) {
    return isLandscape ? "tablet-landscape" : "tablet-portrait";
  }

  return isLandscape ? "phone-landscape" : "phone-portrait";
}

export function AdaptiveWorkspace({
  detailPane,
  phone,
  primaryPane,
  vehiclePane,
}: AdaptiveWorkspaceProps) {
  const { height, width } = useWindowDimensions();
  const layout = resolveWindowLayout(width, height);

  const isPhone = layout.startsWith("phone");
  return (
    <ScreenFrame>
      {isPhone ? (
        phone
      ) : (
        <TabletWorkspace
          detailPane={detailPane}
          primaryPane={primaryPane}
          vehiclePane={vehiclePane}
        />
      )}
    </ScreenFrame>
  );
}

export function TabletWorkspace({ detailPane, primaryPane, vehiclePane }: TabletWorkspaceProps) {
  const { width } = useWindowDimensions();
  const compactDetail = Boolean(detailPane) && width < 1100;
  return (
    <View style={styles.safeArea} testID="tablet-workspace">
      <View style={styles.workspace}>
        <View style={styles.vehiclePane}>{vehiclePane}</View>
        <Animated.View
          layout={LinearTransition.duration(180).reduceMotion(ReduceMotion.System)}
          style={[styles.contentPane, compactDetail && { display: "none" }]}
          accessibilityElementsHidden={compactDetail}
          importantForAccessibility={compactDetail ? "no-hide-descendants" : "auto"}
        >
          {primaryPane}
        </Animated.View>
        {detailPane ? (
          <Animated.View
            entering={FadeIn.duration(160).reduceMotion(ReduceMotion.System)}
            style={styles.contentPane}
          >
            {detailPane}
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#121212",
    padding: 16,
  },
  workspace: {
    flex: 1,
    flexDirection: "row",
    gap: 16,
  },
  vehiclePane: {
    width: 220,
    flexGrow: 0,
    flexShrink: 0,
  },
  contentPane: {
    flex: 1,
    minWidth: 0,
  },
});
