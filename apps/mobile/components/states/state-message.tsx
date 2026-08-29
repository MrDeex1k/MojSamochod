import { Text, View, type ViewProps } from "react-native";

import { Button } from "@/components/ui/button";

type StateMessageProps = ViewProps & {
  actionLabel?: string;
  description?: string;
  onAction?: () => void;
  title: string;
  tone?: "default" | "danger";
};

export function StateMessage({
  actionLabel,
  className,
  description,
  onAction,
  title,
  tone = "default",
  ...props
}: StateMessageProps) {
  const hasAction = actionLabel !== undefined && onAction !== undefined;

  return (
    <View
      accessible={props.accessibilityRole !== undefined}
      className={`w-full max-w-md gap-content ${className ?? ""}`}
      {...props}
    >
      <View className="gap-compact">
        <Text
          className={`text-title font-bold ${tone === "danger" ? "text-danger" : "text-primary"}`}
        >
          {title}
        </Text>
        {description ? (
          <Text className="text-body text-secondary" selectable>
            {description}
          </Text>
        ) : null}
      </View>
      {hasAction ? (
        <Button
          label={actionLabel}
          onPress={onAction}
          variant={tone === "danger" ? "danger" : "primary"}
        />
      ) : null}
    </View>
  );
}
