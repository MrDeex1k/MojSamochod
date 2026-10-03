import { Host, Picker } from "@expo/ui";
import SegmentedControl from "@expo/ui/community/segmented-control";
import { Text, View, useWindowDimensions } from "react-native";
import { nativeTheme } from "@/styles/native-theme";

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
      {menu || fontScale > 1.3 ? (
        <Host
          colorScheme="dark"
          seedColor={nativeTheme.accent}
          matchContents={{ vertical: true }}
          accessibilityLabel={label}
        >
          <Picker selectedValue={value} onValueChange={onSelect}>
            {options.map(([key, text]) => (
              <Picker.Item key={key} value={key} label={text} />
            ))}
          </Picker>
        </Host>
      ) : (
        <SegmentedControl
          appearance="dark"
          values={options.map(([, text]) => text)}
          selectedIndex={options.findIndex(([key]) => key === value)}
          onChange={(event) => {
            const option = options[event.nativeEvent.selectedSegmentIndex];
            if (option) onSelect(option[0]);
          }}
        />
      )}
    </View>
  );
}
