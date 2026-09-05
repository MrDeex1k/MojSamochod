import { createContext, type PropsWithChildren, useContext, useState } from "react";

const ScrollPositions = createContext<Map<string, number> | null>(null);

export function ScrollPositionProvider({ children }: PropsWithChildren) {
  const [positions] = useState(() => new Map<string, number>());
  return <ScrollPositions.Provider value={positions}>{children}</ScrollPositions.Provider>;
}

export function useScrollPosition(key?: string) {
  const positions = useContext(ScrollPositions);
  const [initial] = useState(() => (key ? (positions?.get(key) ?? 0) : 0));
  return {
    initial,
    save: (offset: number) => {
      if (key) positions?.set(key, offset);
    },
  };
}
