import { useState, type PropsWithChildren } from "react";
import { usePreventRemove } from "expo-router";
import Stack from "expo-router/stack";
import { Button as NativeButton } from "react-native";
import { nativeTheme } from "@/styles/native-theme";
import { NativeFormContext, type FormActionProps } from "./native-form-context";
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
        actions: (props) => <Toolbar {...props} />,
        title: (title) => <Stack.Screen options={{ title }} />,
      }}
    >
      {children}
    </NativeFormContext.Provider>
  );
}
function Toolbar({ busy, saveLabel, cancelLabel, onSave, onCancel }: FormActionProps) {
  return (
    <Stack.Screen
      options={{
        headerLeft: () => (
          <NativeButton
            color={nativeTheme.accent}
            title={cancelLabel}
            disabled={busy}
            onPress={onCancel}
          />
        ),
        headerRight: () => (
          <NativeButton
            color={nativeTheme.accent}
            title={saveLabel}
            disabled={busy}
            onPress={onSave}
          />
        ),
      }}
    />
  );
}
