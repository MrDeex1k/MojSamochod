import type { PropsWithChildren } from "react";
import { useWindowDimensions } from "react-native";

import { OrientationGate } from "./orientation-gate";

import { resolveWindowLayout } from "./adaptive-workspace";

export function SupportedOrientation({ children }: PropsWithChildren) {
  const { height, width } = useWindowDimensions();
  const layout = resolveWindowLayout(width, height);

  return (
    <OrientationGate
      blocked={layout === "phone-landscape" || layout === "tablet-portrait"}
      phone={layout.startsWith("phone")}
    >
      {children}
    </OrientationGate>
  );
}
