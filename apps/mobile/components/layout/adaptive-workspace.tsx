import type { ReactNode } from "react";
import { useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Screen } from "@/components/layout/screen";
import { EmptyState } from "@/components/states/empty-state";

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

  if (layout === "phone-portrait") {
    return phone;
  }

  if (layout !== "tablet-landscape") {
    return (
      <Screen contentClassName="items-center justify-center">
        <EmptyState
          description={
            layout === "phone-landscape"
              ? "Widok telefonu jest obecnie przygotowany do pracy w pionie."
              : "Widok tabletu jest obecnie przygotowany do pracy w poziomie."
          }
          title="Obróć urządzenie"
        />
      </Screen>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-canvas p-content">
      <View className="flex-1 flex-row gap-content">
        <View className="basis-[30%]">{vehiclePane}</View>
        <View className="min-w-0 flex-1">{primaryPane}</View>
        {detailPane ? <View className="min-w-0 flex-1">{detailPane}</View> : null}
      </View>
    </SafeAreaView>
  );
}
