import { useSyncExternalStore, type PropsWithChildren } from "react";
import { Host } from "@expo/ui";
import { AlertDialog, TextButton, Text } from "@expo/ui/jetpack-compose";
import { materialSeed, nativeTheme } from "@/styles/native-theme";
import { alertStore } from "@/components/ui/alert-store";
export function AlertProvider({ children }: PropsWithChildren) {
  const request = useSyncExternalStore(alertStore.subscribe, alertStore.getSnapshot);
  return (
    <>
      {children}
      {request ? (
        <Host colorScheme="dark" seedColor={materialSeed}>
          <AlertDialog
            onDismissRequest={alertStore.dismiss}
            properties={{
              dismissOnBackPress: request.options?.cancelable !== false,
              dismissOnClickOutside: request.options?.cancelable !== false,
            }}
          >
            <AlertDialog.Title>
              <Text>{request.title}</Text>
            </AlertDialog.Title>
            {request.message ? (
              <AlertDialog.Text>
                <Text>{request.message}</Text>
              </AlertDialog.Text>
            ) : null}
            <AlertDialog.ConfirmButton>
              {request.buttons
                .filter((button) => button.style !== "cancel")
                .map((button) => (
                  <TextButton
                    key={button.text}
                    onClick={() => alertStore.select(button)}
                    colors={
                      button.style === "destructive"
                        ? { contentColor: nativeTheme.danger }
                        : undefined
                    }
                  >
                    <Text>{button.text}</Text>
                  </TextButton>
                ))}
            </AlertDialog.ConfirmButton>
            <AlertDialog.DismissButton>
              {request.buttons
                .filter((button) => button.style === "cancel")
                .map((button) => (
                  <TextButton key={button.text} onClick={() => alertStore.select(button)}>
                    <Text>{button.text}</Text>
                  </TextButton>
                ))}
            </AlertDialog.DismissButton>
          </AlertDialog>
        </Host>
      ) : null}
    </>
  );
}
