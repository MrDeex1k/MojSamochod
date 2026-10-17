import { materialKeyboardOptions } from "./material-keyboard-options";
import { Host } from "@expo/ui";
import {
  OutlinedTextField,
  Text,
  useNativeState,
  type TextFieldRef,
} from "@expo/ui/jetpack-compose";
import { fillMaxWidth, testID } from "@expo/ui/jetpack-compose/modifiers";
import { useEffect, useId, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { materialSeed } from "@/styles/native-theme";
import { useValidationFocus } from "./validation-focus";
import type { TextFieldProps } from "./text-field";

export function TextField({
  value,
  defaultValue = "",
  label,
  error,
  helperText,
  editable = true,
  multiline = false,
  onChangeText,
  autoCapitalize,
  autoCorrect,
  autoFocus,
  keyboardType,
  inputMode,
  maxLength,
  secureTextEntry,
  nativeID,
  className,
  style,
  testID: identifier,
  returnKeyType,
}: TextFieldProps) {
  const generatedId = useId();
  const input = useRef<TextFieldRef>(null);
  const text = useNativeState(value ?? defaultValue);
  useValidationFocus(nativeID ?? generatedId, input, error);
  useEffect(() => {
    if (value !== undefined && value !== text.get()) text.set(value);
  }, [text, value]);
  return (
    <View className={className}>
      <Host colorScheme="dark" seedColor={materialSeed} matchContents={{ vertical: true }}>
        <OutlinedTextField
          ref={input}
          value={text}
          enabled={editable}
          autoFocus={autoFocus}
          onValueChange={onChangeText}
          singleLine={!multiline}
          minLines={multiline ? 3 : 1}
          textStyle={{ fontSize: StyleSheet.flatten(style)?.fontSize }}
          maxLength={maxLength}
          isError={Boolean(error)}
          visualTransformation={secureTextEntry ? "password" : "none"}
          keyboardOptions={materialKeyboardOptions({
            autoCapitalize,
            autoCorrect,
            keyboardType,
            inputMode,
            returnKeyType,
            multiline,
          })}
          keyboardActions={{ onDone: () => void input.current?.blur() }}
          modifiers={[fillMaxWidth(), ...(identifier ? [testID(identifier)] : [])]}
        >
          <OutlinedTextField.Label>
            <Text>{label}</Text>
          </OutlinedTextField.Label>
          {error || helperText ? (
            <OutlinedTextField.SupportingText>
              <Text>{error ?? helperText}</Text>
            </OutlinedTextField.SupportingText>
          ) : null}
        </OutlinedTextField>
      </Host>
    </View>
  );
}
