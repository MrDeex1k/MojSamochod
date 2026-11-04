import { alertStore } from "./alert-store";

afterEach(() => {
  alertStore.select();
});
it("requires an explicit action for non-cancelable destructive confirmation", () => {
  const destroy = jest.fn();
  const request = {
    title: "Delete",
    buttons: [{ text: "Delete", onPress: destroy }],
    options: { cancelable: false },
  };
  alertStore.show(request);
  alertStore.dismiss();
  expect(alertStore.getSnapshot()).toBe(request);
  expect(destroy).not.toHaveBeenCalled();
  alertStore.select(request.buttons[0]);
  expect(destroy).toHaveBeenCalledTimes(1);
  expect(alertStore.getSnapshot()).toBeNull();
});
it("closes before invoking an action so another confirmation can open", () => {
  const next = { title: "Next", buttons: [] };
  const button = { text: "Continue", onPress: () => alertStore.show(next) };
  alertStore.show({ title: "First", buttons: [button] });
  alertStore.select(button);
  expect(alertStore.getSnapshot()).toBe(next);
});
it("preserves the original pending confirmation when another request arrives", () => {
  const original = { title: "Unsaved draft", buttons: [] };
  alertStore.show(original);
  alertStore.show({ title: "Other action", buttons: [] });
  expect(alertStore.getSnapshot()).toBe(original);
});
it("notifies subscribers and calls the dismissal callback without confirming", () => {
  const notify = jest.fn();
  const dismiss = jest.fn();
  const confirm = jest.fn();
  const unsubscribe = alertStore.subscribe(notify);
  alertStore.show({
    title: "Delete",
    buttons: [{ onPress: confirm }],
    options: { cancelable: true, onDismiss: dismiss },
  });
  alertStore.dismiss();
  unsubscribe();
  expect(notify).toHaveBeenCalledTimes(2);
  expect(dismiss).toHaveBeenCalledTimes(1);
  expect(confirm).not.toHaveBeenCalled();
});
