import type { ComponentProps } from "react";

import { StateMessage } from "@/components/states/state-message";

type ErrorStateProps = Omit<
  ComponentProps<typeof StateMessage>,
  "accessibilityLiveRegion" | "accessibilityRole" | "tone"
>;

export function ErrorState(props: ErrorStateProps) {
  return (
    <StateMessage
      accessibilityLiveRegion="assertive"
      accessibilityRole="alert"
      tone="danger"
      {...props}
    />
  );
}
