import { useId } from "react";
import { Text, TextInput, type TextInputProps, View } from "react-native";

type TextFieldProps = TextInputProps & {
  error?: string;
  helperText?: string;
  label: string;
};

export function TextField({
  accessibilityState,
  className,
  editable = true,
  error,
  helperText,
  label,
  multiline = false,
  nativeID,
  ...props
}: TextFieldProps) {
  const generatedId = useId().replaceAll(":", "");
  const inputId = nativeID ?? `text-field-${generatedId}`;
  const labelId = `${inputId}-label`;
  const supportingText = error ?? helperText;

  return (
    <View className="gap-compact">
      <Text nativeID={labelId} className="text-label font-semibold text-primary">
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityLabelledBy={labelId}
        accessibilityState={{ ...accessibilityState, disabled: !editable }}
        className={`rounded-control border bg-surface-muted px-content text-body text-primary placeholder:text-secondary focus:border-accent disabled:opacity-50 ${
          error ? "border-danger" : "border-divider"
        } ${multiline ? "min-h-28 py-control" : "min-h-12 py-control"} ${className ?? ""}`}
        editable={editable}
        multiline={multiline}
        nativeID={inputId}
        textAlignVertical={multiline ? "top" : "center"}
        {...props}
      />
      {supportingText ? (
        <Text
          accessibilityLiveRegion={error ? "polite" : "none"}
          className={`text-caption ${error ? "text-danger" : "text-secondary"}`}
          selectable
        >
          {supportingText}
        </Text>
      ) : null}
    </View>
  );
}
