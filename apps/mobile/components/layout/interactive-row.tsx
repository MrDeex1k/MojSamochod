import { Platform, Pressable, type PressableProps } from "react-native";
import { nativeTheme } from "@/styles/native-theme";

export function InteractiveRow(props: PressableProps) {
  return (
    <Pressable
      android_ripple={
        Platform.OS === "android" ? { color: `${nativeTheme.accent.slice(0, 7)}24` } : undefined
      }
      {...props}
    />
  );
}
