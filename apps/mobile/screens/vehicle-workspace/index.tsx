import { Text, View } from "react-native";

import { AdaptiveWorkspace } from "@/components/layout/adaptive-workspace";
import { Screen } from "@/components/layout/screen";
import { EmptyState } from "@/components/states/empty-state";
import { Card } from "@/components/ui/card";

function VehicleSummaryPlaceholder() {
  return (
    <Card className="h-full">
      <Text className="text-title font-bold text-primary">Marka + Model</Text>
      <View className="min-h-40 flex-1 items-center justify-center rounded-control bg-surface-muted">
        <Text className="text-label text-secondary">Zdjęcie pojazdu</Text>
      </View>
      <Text className="text-body text-secondary">Wersja pojazdu</Text>
      <Text className="text-heading font-semibold text-primary" selectable>
        Przebieg
      </Text>
    </Card>
  );
}

function HistoryPlaceholder({ tablet = false }: { tablet?: boolean }) {
  const content = (
    <EmptyState
      description="W tym miejscu pojawi się chronologiczna historia pojazdu."
      title="Brak wpisów"
    />
  );

  if (tablet) {
    return <Card className="h-full justify-center">{content}</Card>;
  }

  return (
    <Screen contentClassName="justify-center">
      <Card>{content}</Card>
    </Screen>
  );
}

export function VehicleWorkspaceScreen() {
  return (
    <AdaptiveWorkspace
      phone={<HistoryPlaceholder />}
      primaryPane={<HistoryPlaceholder tablet />}
      vehiclePane={<VehicleSummaryPlaceholder />}
    />
  );
}
