import type { AlertButton, AlertOptions } from "react-native";
type Request = { title: string; message?: string; buttons: AlertButton[]; options?: AlertOptions };
let current: Request | null = null;
const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((listener) => listener());
}
export const alertStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: () => current,
  show(request: Request) {
    if (current) return;
    current = request;
    emit();
  },
  select(button?: AlertButton) {
    if (!current) return;
    if (button && !current.buttons.includes(button)) return;
    current = null;
    emit();
    button?.onPress?.();
  },
  dismiss(expected: Request | null = current) {
    if (!current || current !== expected || current.options?.cancelable === false) return;
    const request = current;
    current = null;
    emit();
    request.options?.onDismiss?.();
  },
};
