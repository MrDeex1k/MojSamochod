import { useState } from "react";
import { Alert, BackHandler, Button, TextInput, View } from "react-native";
import { act, render, screen, userEvent } from "@testing-library/react-native";
import {
  NavigationGuardProvider,
  useFormExitGuard,
  useGuardedNavigation,
  useNavigationRemovalGuard,
} from "./navigation-guard";

function Form({ onLeave, busy = false }: { onLeave: () => void; busy?: boolean }) {
  const [value, setValue] = useState("");
  const navigate = useGuardedNavigation();
  const cancel = useFormExitGuard(value, busy, () => navigate(onLeave));
  return (
    <View>
      <TextInput accessibilityLabel="Draft" value={value} onChangeText={setValue} />
      <Button title="Cancel" onPress={cancel} />
      <Button title="Other pane" onPress={() => navigate(onLeave)} />
    </View>
  );
}

it("confirms a dirty cross-pane transition once, preserving the draft when cancelled", async () => {
  const onLeave = jest.fn();
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
  await render(
    <NavigationGuardProvider>
      <Form onLeave={onLeave} />
    </NavigationGuardProvider>,
  );
  await userEvent.type(screen.getByLabelText("Draft"), "Unsaved");
  await userEvent.press(screen.getByRole("button", { name: "Other pane" }));
  expect(onLeave).not.toHaveBeenCalled();
  await act(() => alert.mock.calls[0][2]?.find((button) => button.style === "cancel")?.onPress?.());
  expect(screen.getByLabelText("Draft")).toHaveDisplayValue("Unsaved");
  await userEvent.press(screen.getByRole("button", { name: "Cancel" }));
  await act(() =>
    alert.mock.calls[1][2]?.find((button) => button.style === "destructive")?.onPress?.(),
  );
  expect(onLeave).toHaveBeenCalledTimes(1);
  expect(alert).toHaveBeenCalledTimes(2);
});

it("clears native removal blocking when a dirty form unmounts", async () => {
  function RemovalStatus() {
    const { blocked } = useNavigationRemovalGuard();
    return <Button title="Back" disabled={blocked} />;
  }
  const onLeave = jest.fn();
  const tree = (show: boolean) => (
    <NavigationGuardProvider>
      <RemovalStatus />
      {show && <Form onLeave={onLeave} />}
    </NavigationGuardProvider>
  );
  const view = await render(tree(true));
  await userEvent.type(screen.getByLabelText("Draft"), "Unsaved");
  expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();
  await view.rerender(tree(false));
  expect(screen.getByRole("button", { name: "Back" })).toBeEnabled();
});

it("blocks embedded-form hardware back during a write and permits an unchanged form afterwards", async () => {
  let back: (() => boolean | null | undefined) | undefined;
  jest.spyOn(BackHandler, "addEventListener").mockImplementation((_event, callback) => {
    back = () => callback({} as Parameters<typeof callback>[0]);
    return { remove: jest.fn() };
  });
  const onLeave = jest.fn();
  const view = await render(<Form onLeave={onLeave} busy />);
  await act(() => {
    expect(back?.()).toBe(true);
  });
  expect(onLeave).not.toHaveBeenCalled();
  await view.rerender(<Form onLeave={onLeave} />);
  await act(() => {
    back?.();
  });
  expect(onLeave).toHaveBeenCalledTimes(1);
});

it("delegates route-owned back to the native stack removal guard", async () => {
  const subscribe = jest.spyOn(BackHandler, "addEventListener");
  await render(
    <NavigationGuardProvider>
      <Form onLeave={jest.fn()} />
    </NavigationGuardProvider>,
  );
  expect(subscribe).not.toHaveBeenCalled();
});
