import { StyleSheet, Text, View } from "react-native";

import { AdaptiveWorkspace } from "@/components/layout/adaptive-workspace";
import { Screen } from "@/components/layout/screen";
import { Card } from "@/components/ui/card";

function VehicleSummaryPlaceholder() {
  return (
    <Card style={styles.fullHeightCard}>
      <Text style={styles.title}>Marka + Model</Text>
      <View className="rounded-control bg-surface-muted" style={styles.photoPlaceholder}>
        <Text style={styles.secondaryText}>Zdjęcie pojazdu</Text>
      </View>
      <Text style={styles.secondaryText}>Wersja pojazdu</Text>
      <Text selectable style={styles.mileage}>
        Przebieg
      </Text>
    </Card>
  );
}

function HistoryPlaceholder({ tablet = false }: { tablet?: boolean }) {
  const content = (
    <View style={styles.emptyState}>
      <Text style={styles.title}>Brak wpisów</Text>
      <Text selectable style={styles.secondaryText}>
        W tym miejscu pojawi się chronologiczna historia pojazdu.
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
