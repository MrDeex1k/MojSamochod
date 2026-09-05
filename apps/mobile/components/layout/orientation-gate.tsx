import type { PropsWithChildren } from "react";
import { View } from "react-native";

import { EmptyState } from "@/components/states/empty-state";
import { useAppTranslation } from "@/localization/use-app-translation";
import { Screen } from "./screen";

export function OrientationGate({
  children,
  blocked,
  phone,
}: PropsWithChildren<{
  blocked: boolean;
  phone: boolean;
}>) {
  const { t } = useAppTranslation();
  return (
    <View style={{ flex: 1 }}>
      <View
        style={{ flex: 1, display: blocked ? "none" : "flex" }}
        accessibilityElementsHidden={blocked}
        importantForAccessibility={blocked ? "no-hide-descendants" : "auto"}
      >
        {children}
      </View>
      {blocked ? (
        <Screen contentClassName="items-center justify-center">
          <EmptyState
            description={t(
              phone ? "orientation.phoneDescription" : "orientation.tabletDescription",
            )}
            title={t("orientation.title")}
          />
        </Screen>
      ) : null}
    </View>
  );
}
