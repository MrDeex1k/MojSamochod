import { useRouter } from "expo-router";
import { Text } from "react-native";

import { Screen } from "@/components/layout/screen";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TextField } from "@/components/ui/text-field";

export function FirstVehicleSetupScreen() {
  const router = useRouter();

  return (
    <Screen contentClassName="items-center justify-center">
      <Card className="w-full max-w-md">
        <Text className="text-label font-semibold uppercase tracking-widest text-accent">
          Moje Auto
        </Text>
        <Text className="text-display font-bold text-primary">Dodaj pierwszy pojazd</Text>
        <Text className="text-body text-secondary">
          Formularz pojazdu zostanie zbudowany na przygotowanym fundamencie interfejsu.
        </Text>
        <TextField label="Marka" placeholder="np. Toyota" />
        <Button label="Przejdź dalej" onPress={() => router.push("/vehicle")} />
      </Card>
    </Screen>
  );
}
