import { useState } from "react";
import { Alert, BackHandler, Button, TextInput, View } from "react-native";
import { act, render, screen, userEvent } from "@testing-library/react-native";
import {
  NavigationGuardProvider,
  useFormExitGuard,
  useGuardedNavigation,
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

it("blocks hardware back during a write and permits an unchanged form afterwards", async () => {
  let back: (() => boolean | null | undefined) | undefined;
  jest.spyOn(BackHandler, "addEventListener").mockImplementation((_event, callback) => {
    back = () => callback({} as Parameters<typeof callback>[0]);
    return { remove: jest.fn() };
  });
  const onLeave = jest.fn();
  const view = await render(
    <NavigationGuardProvider>
      <Form onLeave={onLeave} busy />
    </NavigationGuardProvider>,
  );
  await act(() => {
    expect(back?.()).toBe(true);
  });
  expect(onLeave).not.toHaveBeenCalled();
  await view.rerender(
    <NavigationGuardProvider>
      <Form onLeave={onLeave} />
    </NavigationGuardProvider>,
  );
  await act(() => {
    back?.();
  });
  expect(onLeave).toHaveBeenCalledTimes(1);
});
