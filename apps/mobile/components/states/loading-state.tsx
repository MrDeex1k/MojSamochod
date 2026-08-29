import { ActivityIndicator, Text, View, type ViewProps } from "react-native";

type LoadingStateProps = ViewProps & {
  label: string;
};

export function LoadingState({ className, label, ...props }: LoadingStateProps) {
  return (
    <View className={`items-center gap-content ${className ?? ""}`} {...props}>
      <ActivityIndicator
        accessibilityLabel={label}
        accessibilityRole="progressbar"
        className="text-accent"
        size="large"
      />
      <Text className="text-body text-secondary">{label}</Text>
    </View>
  );
}
