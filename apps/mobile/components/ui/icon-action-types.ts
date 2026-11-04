export type IconActionProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  icon: "close" | "more" | "previous" | "next" | "zoom-in" | "zoom-out";
};
