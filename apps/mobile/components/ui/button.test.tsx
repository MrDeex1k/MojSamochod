import { render, screen, userEvent } from "@testing-library/react-native";

import { Button } from "./button";

describe("Button", () => {
  it("blocks duplicate submissions while announcing progress", async () => {
    const onPress = jest.fn();
    await render(<Button busy label="Save" onPress={onPress} />);
    const button = screen.getByRole("button", { busy: true, disabled: true });
    await userEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
  it("calls the handler when pressed", async () => {
    const onPress = jest.fn();

    await render(<Button label="Save" onPress={onPress} />);
    await userEvent.press(screen.getByRole("button", { name: "Save" }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("does not call the handler when disabled", async () => {
    const onPress = jest.fn();

    await render(<Button disabled label="Save" onPress={onPress} />);
    await userEvent.press(screen.getByRole("button", { name: "Save", disabled: true }));

    expect(onPress).not.toHaveBeenCalled();
  });
});
