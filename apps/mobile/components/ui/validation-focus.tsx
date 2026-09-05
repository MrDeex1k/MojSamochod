import type { TextInput } from "react-native";
import {
  createContext,
  type PropsWithChildren,
  type RefObject,
  useContext,
  useEffect,
  useState,
} from "react";

type Field = { focus: () => void; error?: string };

function createFocusGroup() {
  const fields = new Map<string, Field>();
  let scheduled = false;
  return {
    register(id: string, focus: () => void) {
      fields.set(id, { focus });
      return () => {
        fields.delete(id);
      };
    },
    report(id: string, error?: string) {
      const field = fields.get(id);
      if (!field) return;
      field.error = error;
      if (!error || scheduled) return;
      scheduled = true;
      queueMicrotask(() => {
        scheduled = false;
        [...fields.values()].find((item) => item.error)?.focus();
      });
    },
  };
}

const ValidationContext = createContext<ReturnType<typeof createFocusGroup> | null>(null);

export function ValidationFocusProvider({ children }: PropsWithChildren) {
  const [group] = useState(createFocusGroup);
  return <ValidationContext.Provider value={group}>{children}</ValidationContext.Provider>;
}

export function useValidationFocus(id: string, input: RefObject<TextInput | null>, error?: string) {
  const group = useContext(ValidationContext);
  useEffect(() => group?.register(id, () => input.current?.focus()), [group, id, input]);
  useEffect(() => {
    group?.report(id, error);
  }, [group, id, error]);
}
