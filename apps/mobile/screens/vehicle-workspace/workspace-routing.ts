import { router } from "expo-router";
import type { WorkspaceMode } from "./workspace-types";

export function navigateToMode(mode: WorkspaceMode) {
  switch (mode.kind) {
    case "history":
      router.navigate("/vehicle/(tabs)/overview");
      return;
    case "fuel":
      router.navigate("/vehicle/(tabs)/fuel");
      return;
    case "reminders":
      router.navigate("/vehicle/(tabs)/reminders");
      return;
    case "data-management":
      router.push("/vehicle/data-management");
      return;
    case "documents":
      router.push("/vehicle/documents");
      return;
    case "select-type":
      router.push("/vehicle/select-type");
      return;
  }
  const params: Record<string, string> = { kind: mode.kind };
  if ("entry" in mode && mode.entry) params.id = mode.entry.id;
  if ("document" in mode && mode.document) params.id = mode.document.id;
  if ("refuelling" in mode && mode.refuelling) params.id = mode.refuelling.id;
  if ("type" in mode) params.type = mode.type;
  if ("returnTo" in mode) params.returnTo = mode.returnTo;
  router.push({
    pathname: mode.kind.endsWith("form") ? "/vehicle/editor" : "/vehicle/detail",
    params,
  });
}
