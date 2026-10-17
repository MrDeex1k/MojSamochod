import { useState, type PropsWithChildren } from "react";
import { usePreventRemove } from "expo-router";
import Stack from "expo-router/stack";
import { FormToolbar } from "./form-toolbar";
import { NativeFormContext } from "./native-form-context";
import { NavigationGuardProvider, useNavigationRemovalGuard } from "./navigation-guard";

export function NativeFormProvider({ children }: PropsWithChildren) {
  return (
    <NavigationGuardProvider>
      <RemovalGuard>{children}</RemovalGuard>
    </NavigationGuardProvider>
  );
}
function RemovalGuard({ children }: PropsWithChildren) {
  const { blocked, navigate } = useNavigationRemovalGuard();
  const [finished, setFinished] = useState(false);
  const disable = usePreventRemove(blocked && !finished, ({ repeat }) => {
    navigate(() => {
      setFinished(true);
      repeat();
    });
  });
  return (
    <NativeFormContext.Provider
      value={{
        finish: () => {
          setFinished(true);
          disable();
        },
        actions: (props) => <FormToolbar {...props} />,
        title: (title) => <Stack.Screen options={{ title }} />,
      }}
    >
      {children}
    </NativeFormContext.Provider>
  );
}
