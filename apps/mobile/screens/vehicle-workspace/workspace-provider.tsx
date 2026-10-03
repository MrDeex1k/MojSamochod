import { createContext, useContext, useState, type PropsWithChildren } from "react";
import { useApplicationServices } from "@/components/providers/application-provider";
import { ScrollPositionProvider } from "@/components/layout/scroll-positions";
import { WorkspaceDataSource } from "./workspace-data-source";

const WorkspaceContext = createContext<{
  source: WorkspaceDataSource;
  revision: number;
  refresh: () => void;
} | null>(null);

export function WorkspaceProvider({ children }: PropsWithChildren) {
  const services = useApplicationServices();
  const [source] = useState(() => new WorkspaceDataSource(services));
  const [revision, setRevision] = useState(0);
  return (
    <WorkspaceContext.Provider
      value={{ source, revision, refresh: () => setRevision((value) => value + 1) }}
    >
      <ScrollPositionProvider>{children}</ScrollPositionProvider>
    </WorkspaceContext.Provider>
  );
}

export function useWorkspaceSource() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("WorkspaceProvider is required");
  return value;
}
