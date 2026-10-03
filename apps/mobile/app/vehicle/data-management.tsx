import { WorkspaceRoute } from "@/screens/vehicle-workspace/workspace-route";
import { NativeFormProvider } from "@/components/layout/native-form-provider";
export default function Route() {
  return (
    <NativeFormProvider>
      <WorkspaceRoute kind="data-management" />
    </NativeFormProvider>
  );
}
