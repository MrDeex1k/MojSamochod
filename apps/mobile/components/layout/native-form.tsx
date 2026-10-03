import { NativeFormContext, type FormActionProps } from "./native-form-context";
import { useContext, type PropsWithChildren } from "react";
import { Text } from "react-native";
import { Button } from "@/components/ui/button";

export function FormActions(props: FormActionProps) {
  const native = useContext(NativeFormContext);
  if (native) return native.actions(props);
  return (
    <>
      <Button busy={props.busy} label={props.saveLabel} onPress={props.onSave} />
      <Button
        disabled={props.busy}
        label={props.cancelLabel}
        onPress={props.onCancel}
        variant="secondary"
      />
    </>
  );
}

export function FormTitle({ children }: PropsWithChildren) {
  const native = useContext(NativeFormContext);
  return native && typeof children === "string" ? (
    native.title(children)
  ) : (
    <Text accessibilityRole="header" className="text-title font-bold text-primary">
      {children}
    </Text>
  );
}
