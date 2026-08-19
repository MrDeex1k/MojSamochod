import { Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-slate-950 px-6">
      <View className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <Text className="text-sm font-semibold uppercase tracking-widest text-sky-400">
          Moje Auto
        </Text>
        <Text className="mt-3 text-3xl font-bold text-white">Wszystko działa</Text>
        <Text className="mt-3 text-base leading-6 text-slate-300">
          Expo SDK 57, React Native 0.86, NativeWind 5 i Tailwind CSS 4 są gotowe.
        </Text>
      </View>
    </View>
  );
}
