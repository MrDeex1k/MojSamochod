import { useContext } from "react";
import { Button } from "@/components/ui/button";
import { NativeNavigationFrameContext } from "./native-navigation-context";

export function BackAction({ label, onPress }: { label: string; onPress: () => void }) {
  const native = useContext(NativeNavigationFrameContext);
  return native ? null : <Button label={label} onPress={onPress} variant="secondary" />;
}
