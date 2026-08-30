import type { ReactNode } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Screen } from "@/components/layout/screen";
import { EmptyState } from "@/components/states/empty-state";
import { useAppTranslation } from "@/localization/use-app-translation";

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
  const { t } = useAppTranslation();
  const { height, width } = useWindowDimensions();
  const layout = resolveWindowLayout(width, height);

  if (layout === "phone-portrait") {
    return phone;
  }

  if (layout !== "tablet-landscape") {
    return (
      <Screen contentClassName="items-center justify-center">
        <EmptyState
          description={
            layout === "phone-landscape"
              ? t("orientation.phoneDescription")
              : t("orientation.tabletDescription")
          }
          title={t("orientation.title")}
        />
      </Screen>
    );
  }

  return (
    <TabletWorkspace detailPane={detailPane} primaryPane={primaryPane} vehiclePane={vehiclePane} />
  );
}

export function TabletWorkspace({ detailPane, primaryPane, vehiclePane }: TabletWorkspaceProps) {
  return (
    <SafeAreaView style={styles.safeArea} testID="tablet-workspace">
      <View style={styles.workspace}>
        <View style={styles.vehiclePane}>{vehiclePane}</View>
        <View style={styles.contentPane}>{primaryPane}</View>
        {detailPane ? <View style={styles.contentPane}>{detailPane}</View> : null}
      </View>
    </SafeAreaView>
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
    flexBasis: "30%",
    flexGrow: 0,
    flexShrink: 0,
  },
  contentPane: {
    flex: 1,
    minWidth: 0,
  },
});
