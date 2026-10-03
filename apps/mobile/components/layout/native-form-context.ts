import { createContext, useContext, type ReactNode } from "react";
export type FormActionProps = Readonly<{
  busy: boolean;
  saveLabel: string;
  cancelLabel: string;
  onSave: () => void;
  onCancel: () => void;
}>;
export const NativeFormContext = createContext<null | {
  finish: () => void;
  actions: (props: FormActionProps) => ReactNode;
  title: (title: string) => ReactNode;
}>(null);

export function useFinishNativeForm() {
  return useContext(NativeFormContext)?.finish;
}
