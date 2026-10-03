import { NativeFormProvider } from "@/components/layout/native-form-provider";
import { WorkspaceRoute } from "@/screens/vehicle-workspace/workspace-route";
export default function EditorRoute() {
  return (
    <NativeFormProvider>
      <WorkspaceRoute />
    </NativeFormProvider>
  );
}
