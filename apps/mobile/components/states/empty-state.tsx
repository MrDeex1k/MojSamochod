import type { ComponentProps } from "react";

import { StateMessage } from "@/components/states/state-message";

type EmptyStateProps = Omit<ComponentProps<typeof StateMessage>, "tone">;

export function EmptyState(props: EmptyStateProps) {
  return <StateMessage tone="default" {...props} />;
}
