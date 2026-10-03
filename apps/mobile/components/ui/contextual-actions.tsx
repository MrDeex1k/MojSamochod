import { View } from "react-native";
import { Button } from "./button";
import { ActionMenu } from "./action-menu";

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
  return (
    <View className="flex-row flex-wrap items-center gap-content">
      <View className="flex-1">
        <Button disabled={disabled} label={editLabel} onPress={onEdit} />
      </View>
      <ActionMenu
        disabled={disabled}
        label={menuLabel}
        title={menuTitle}
        cancelLabel={cancelLabel}
        deleteLabel={deleteLabel}
        onDelete={onDelete}
      />
    </View>
  );
}
