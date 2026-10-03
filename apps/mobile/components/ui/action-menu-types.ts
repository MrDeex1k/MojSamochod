export type ActionMenuProps = Readonly<{
  label: string;
  title: string;
  cancelLabel: string;
  deleteLabel: string;
  disabled?: boolean;
  onDelete: () => void;
}>;
