import { alertStore } from "./alert-store";

const subscriptions: (() => void)[] = [];

function observe() {
  const listener = jest.fn();
  subscriptions.push(alertStore.subscribe(listener));
  return listener;
}

afterEach(() => {
  subscriptions.splice(0).forEach((unsubscribe) => unsubscribe());
  alertStore.select();
});

it("ignores a selection when no alert is active", () => {
  const onPress = jest.fn();
  const listener = observe();

  alertStore.select({ text: "Delete", onPress });

  expect(onPress).not.toHaveBeenCalled();
  expect(listener).not.toHaveBeenCalled();
  expect(alertStore.getSnapshot()).toBeNull();
});

it("ignores a button that does not belong to the active alert", () => {
  const request = { title: "Current", buttons: [{ text: "Keep editing" }] };
  const onPress = jest.fn();
  alertStore.show(request);
  const listener = observe();

  alertStore.select({ text: "Delete", onPress });

  expect(alertStore.getSnapshot()).toBe(request);
  expect(onPress).not.toHaveBeenCalled();
  expect(listener).not.toHaveBeenCalled();
});

it("executes an active button only once when selection arrives twice", () => {
  const onPress = jest.fn();
  const button = { text: "Delete", onPress };
  alertStore.show({ title: "Delete", buttons: [button] });
  const listener = observe();

  alertStore.select(button);
  alertStore.select(button);

  expect(onPress).toHaveBeenCalledTimes(1);
  expect(listener).toHaveBeenCalledTimes(1);
  expect(alertStore.getSnapshot()).toBeNull();
});

it("preserves a new alert when a stale button from the previous one arrives", () => {
  const next = { title: "Next", buttons: [{ text: "Continue" }] };
  const onPress = jest.fn(() => {
    expect(alertStore.getSnapshot()).toBeNull();
    alertStore.show(next);
  });
  const button = { text: "Delete", onPress };
  alertStore.show({ title: "First", buttons: [button] });
  alertStore.select(button);
  const listener = observe();

  alertStore.select(button);

  expect(onPress).toHaveBeenCalledTimes(1);
  expect(listener).not.toHaveBeenCalled();
  expect(alertStore.getSnapshot()).toBe(next);
});

it("can clear an active request without invoking a button", () => {
  const onPress = jest.fn();
  alertStore.show({ title: "Current", buttons: [{ text: "Delete", onPress }] });

  alertStore.select();

  expect(alertStore.getSnapshot()).toBeNull();
  expect(onPress).not.toHaveBeenCalled();
});
