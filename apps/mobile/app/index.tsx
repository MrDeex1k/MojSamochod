import { Text, View } from "react-native";

export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-canvas px-screen">
      <View className="w-full max-w-md gap-content rounded-panel border border-divider bg-surface p-screen">
        <Text className="text-label font-semibold uppercase tracking-widest text-accent">
          Moje Auto
        </Text>
        <Text className="text-display font-bold text-primary">Fundament interfejsu</Text>
        <Text className="text-body text-secondary">
          Ciemny motyw i semantyczne tokeny są gotowe na pierwsze ekrany aplikacji.
        </Text>
      </View>
    </View>
  );
}
