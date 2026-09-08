import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "./button";
import { NavigationSurface, useNavigationMaterial } from "./navigation-surface";

type ContextualActionsProps = Readonly<{
  cancelLabel: string;
  deleteLabel: string;
  disabled?: boolean;
  editLabel: string;
  menuLabel: string;
  menuTitle: string;
  onDelete: () => void;
  onEdit: () => void;
}>;

export function ContextualActions({
  cancelLabel,
  deleteLabel,
  disabled = false,
  editLabel,
  menuLabel,
  menuTitle,
  onDelete,
  onEdit,
}: ContextualActionsProps) {
  const [open, setOpen] = useState(false);
  const material = useNavigationMaterial();
  return (
    <>
      <View style={styles.primaryRow}>
        <View style={styles.editAction}>
          <Button disabled={disabled} label={editLabel} onPress={onEdit} />
        </View>
        <NavigationSurface material={material} style={styles.triggerSurface}>
          <Pressable
            accessibilityLabel={menuLabel}
            accessibilityRole="button"
            accessibilityState={{ expanded: open, disabled }}
            disabled={disabled}
            onPress={() => setOpen(true)}
            style={styles.trigger}
          >
            <Text accessible={false} className="text-title font-semibold text-accent">
              ···
            </Text>
          </Pressable>
        </NavigationSurface>
      </View>
      {open ? (
        <Modal
          animationType="none"
          navigationBarTranslucent
          onRequestClose={() => setOpen(false)}
          statusBarTranslucent
          testID="contextual-actions-modal"
          transparent
          visible
        >
          <SafeAreaProvider>
            <ActionMenu
              cancelLabel={cancelLabel}
              deleteLabel={deleteLabel}
              material={material}
              menuLabel={menuLabel}
              menuTitle={menuTitle}
              onCancel={() => setOpen(false)}
              onDelete={() => {
                setOpen(false);
                onDelete();
              }}
            />
          </SafeAreaProvider>
        </Modal>
      ) : null}
    </>
  );
}

function ActionMenu({
  cancelLabel,
  deleteLabel,
  material,
  menuLabel,
  menuTitle,
  onCancel,
  onDelete,
}: Readonly<{
  cancelLabel: string;
  deleteLabel: string;
  material: ReturnType<typeof useNavigationMaterial>;
  menuLabel: string;
  menuTitle: string;
  onCancel: () => void;
  onDelete: () => void;
}>) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.modalRoot}>
      <Pressable accessible={false} onPress={onCancel} style={StyleSheet.absoluteFill} />
      <NavigationSurface
        accessibilityLabel={menuLabel}
        accessibilityViewIsModal
        material={material}
        style={[styles.menu, { marginBottom: Math.max(insets.bottom, 12) }]}
      >
        <Text
          accessibilityRole="header"
          className="px-content pb-compact pt-content text-heading font-semibold text-primary"
        >
          {menuTitle}
        </Text>
        <Pressable
          accessibilityLabel={deleteLabel}
          accessibilityRole="button"
          onPress={onDelete}
          style={styles.menuAction}
        >
          <Text className="text-body font-semibold text-danger">{deleteLabel}</Text>
        </Pressable>
        <View className="mx-content border-t border-divider" />
        <Pressable
          accessibilityLabel={cancelLabel}
          accessibilityRole="button"
          onPress={onCancel}
          style={styles.menuAction}
          testID="contextual-actions-cancel"
        >
          <Text className="text-body font-semibold text-accent">{cancelLabel}</Text>
        </Pressable>
      </NavigationSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  primaryRow: { flexDirection: "row", alignItems: "stretch", gap: 12 },
  editAction: { flex: 1 },
  triggerSurface: { width: 52, overflow: "hidden" },
  trigger: { width: 52, minHeight: 48, alignItems: "center", justifyContent: "center" },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.56)",
    paddingHorizontal: 12,
  },
  menu: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    overflow: "hidden",
  },
  menuAction: { minHeight: 56, justifyContent: "center", paddingHorizontal: 20 },
});
