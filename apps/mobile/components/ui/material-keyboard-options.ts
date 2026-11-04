import type { TextInputProps } from "react-native";
import type { TextFieldKeyboardOptions } from "@expo/ui/jetpack-compose";
export function materialKeyboardOptions({
  autoCapitalize,
  autoCorrect,
  keyboardType,
  inputMode,
  returnKeyType,
  multiline,
}: TextInputProps): TextFieldKeyboardOptions {
  const numeric =
    inputMode === "numeric" || keyboardType === "number-pad" || keyboardType === "numeric";
  const decimal = inputMode === "decimal" || keyboardType === "decimal-pad";
  const type = decimal
    ? "decimal"
    : numeric
      ? "number"
      : keyboardType === "email-address"
        ? "email"
        : keyboardType === "phone-pad"
          ? "phone"
          : keyboardType === "url"
            ? "uri"
            : "text";
  const action =
    returnKeyType === "search"
      ? "search"
      : returnKeyType === "next"
        ? "next"
        : multiline
          ? "default"
          : "done";
  return {
    capitalization: autoCapitalize ?? "sentences",
    autoCorrectEnabled: autoCorrect ?? (!numeric && !decimal),
    keyboardType: type,
    imeAction: action,
  };
}
