import NativePicker, { type IOSNativeProps } from "@react-native-community/datetimepicker";
export type DateTimePickerProps = Omit<IOSNativeProps, "mode"> & {
  mode?: "date" | "time";
  is24Hour?: boolean;
};
export default function DateTimePicker(props: DateTimePickerProps) {
  return <NativePicker {...props} />;
}
