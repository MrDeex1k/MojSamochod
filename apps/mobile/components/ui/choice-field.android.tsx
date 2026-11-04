import { Host, Picker } from "@expo/ui";
import {
  SingleChoiceSegmentedButtonRow,
  SegmentedButton,
  Text as MaterialText,
} from "@expo/ui/jetpack-compose";
import { fillMaxWidth } from "@expo/ui/jetpack-compose/modifiers";
import { Text, View, useWindowDimensions } from "react-native";
import { materialSeed } from "@/styles/native-theme";

export function ChoiceField<T extends string>({
  label,
  onSelect,
  options,
  value,
  menu = false,
}: Readonly<{
  label: string;
  onSelect: (value: T) => void;
  options: readonly (readonly [T, string])[];
  value: T;
  menu?: boolean;
}>) {
  const { fontScale } = useWindowDimensions();
  return (
    <View className="gap-compact">
      <Text className="text-label font-semibold text-primary">{label}</Text>
      <Host colorScheme="dark" seedColor={materialSeed} matchContents={{ vertical: true }}>
        {menu || fontScale > 1.3 ? (
          <Picker selectedValue={value} onValueChange={onSelect}>
            {options.map(([key, text]) => (
              <Picker.Item key={key} value={key} label={text} />
            ))}
          </Picker>
        ) : (
          <SingleChoiceSegmentedButtonRow modifiers={[fillMaxWidth()]}>
            {options.map(([key, text]) => (
              <SegmentedButton key={key} selected={key === value} onClick={() => onSelect(key)}>
                <SegmentedButton.Label>
                  <MaterialText>{text}</MaterialText>
                </SegmentedButton.Label>
              </SegmentedButton>
            ))}
          </SingleChoiceSegmentedButtonRow>
        )}
      </Host>
    </View>
  );
}
