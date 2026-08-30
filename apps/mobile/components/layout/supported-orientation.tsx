import type { PropsWithChildren } from "react";
import { useWindowDimensions } from "react-native";

import { EmptyState } from "@/components/states/empty-state";
import { useAppTranslation } from "@/localization/use-app-translation";

import { resolveWindowLayout } from "./adaptive-workspace";
import { Screen } from "./screen";

export function SupportedOrientation({ children }: PropsWithChildren) {
  const { height, width } = useWindowDimensions();
  const { t } = useAppTranslation();
  const layout = resolveWindowLayout(width, height);

  if (layout === "phone-portrait" || layout === "tablet-landscape") return children;
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
