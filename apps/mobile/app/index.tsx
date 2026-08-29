import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TextField } from "@/components/ui/text-field";

export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-canvas px-screen">
      <Card className="w-full max-w-md">
        <Text className="text-label font-semibold uppercase tracking-widest text-accent">
          Moje Auto
        </Text>
        <Text className="text-display font-bold text-primary">Fundament interfejsu</Text>
        <Text className="text-body text-secondary">
          Podstawowe kontrolki są gotowe na pierwszy formularz pojazdu.
        </Text>
        <TextField label="Marka" placeholder="np. Toyota" />
        <Button label="Przejdź dalej" onPress={() => undefined} />
      </Card>
    </View>
  );
}
