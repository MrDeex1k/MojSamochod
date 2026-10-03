import { NativeFormProvider } from "@/components/layout/native-form-provider";
import { ReminderEditorScreen } from "@/screens/vehicle-workspace/reminder-editor-screen";
export default function Route() {
  return (
    <NativeFormProvider>
      <ReminderEditorScreen />
    </NativeFormProvider>
  );
}
