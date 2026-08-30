import { StyleSheet, Text, View } from "react-native";

import { AdaptiveWorkspace } from "@/components/layout/adaptive-workspace";
import { Screen } from "@/components/layout/screen";
import { Card } from "@/components/ui/card";
import { useAppTranslation } from "@/localization/use-app-translation";

function VehicleSummaryPlaceholder() {
  const { t } = useAppTranslation();

  return (
    <Card style={styles.fullHeightCard}>
      <Text style={styles.title}>{t("workspace.makeAndModel")}</Text>
      <View className="rounded-control bg-surface-muted" style={styles.photoPlaceholder}>
        <Text style={styles.secondaryText}>{t("workspace.photo")}</Text>
      </View>
      <Text style={styles.secondaryText}>{t("workspace.variant")}</Text>
      <Text selectable style={styles.mileage}>
        {t("workspace.mileage")}
      </Text>
    </Card>
  );
}

function HistoryPlaceholder({ tablet = false }: { tablet?: boolean }) {
  const { t } = useAppTranslation();
  const content = (
    <View style={styles.emptyState}>
      <Text style={styles.title}>{t("workspace.noEntries")}</Text>
      <Text selectable style={styles.secondaryText}>
        {t("workspace.historyDescription")}
      </Text>
    </View>
  );

  if (tablet) {
    return <Card style={[styles.fullHeightCard, styles.centeredCard]}>{content}</Card>;
  }

  return (
    <Screen contentClassName="justify-center">
      <Card>{content}</Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fullHeightCard: {
    flex: 1,
  },
  centeredCard: {
    justifyContent: "center",
  },
  emptyState: {
    gap: 8,
  },
  title: {
    color: "#f2f0e8",
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 32,
  },
  secondaryText: {
    color: "#aab0a7",
    fontSize: 16,
    lineHeight: 24,
  },
  photoPlaceholder: {
    width: "100%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  mileage: {
    color: "#f2f0e8",
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 24,
  },
});

export function VehicleWorkspaceScreen() {
  return (
    <AdaptiveWorkspace
      phone={<HistoryPlaceholder />}
      primaryPane={<HistoryPlaceholder tablet />}
      vehiclePane={<VehicleSummaryPlaceholder />}
    />
  );
}
