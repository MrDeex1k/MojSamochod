import { createContext, useContext, useState, type PropsWithChildren } from "react";
import { useApplicationServices } from "@/components/providers/application-provider";
import { ScrollPositionProvider } from "@/components/layout/scroll-positions";
import { WorkspaceDataSource, type WorkspaceSection } from "./workspace-data-source";

const WorkspaceContext = createContext<{
  source: WorkspaceDataSource;
  revision: number;
  refresh: () => void;
  selection: Partial<Record<WorkspaceSection, string>>;
  select: (section: WorkspaceSection, id: string) => void;
} | null>(null);

export function WorkspaceProvider({ children }: PropsWithChildren) {
  const services = useApplicationServices();
  const [source] = useState(() => new WorkspaceDataSource(services));
  const [revision, setRevision] = useState(0);
  const [selection, setSelection] = useState<Partial<Record<WorkspaceSection, string>>>({});
  return (
    <WorkspaceContext.Provider
      value={{
        source,
        revision,
        refresh: () => setRevision((value) => value + 1),
        selection,
        select: (section, id) => setSelection((previous) => ({ ...previous, [section]: id })),
      }}
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
