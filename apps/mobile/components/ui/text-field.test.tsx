import { render, screen, userEvent } from "@testing-library/react-native";

import { TextField } from "./text-field";

describe("TextField", () => {
  it("exposes its label and accepts input", async () => {
    const onChangeText = jest.fn();

    await render(
      <TextField label="Brand" onChangeText={onChangeText} placeholder="For example Toyota" />,
    );
    await userEvent.type(screen.getByLabelText("Brand"), "Toyota");

    expect(onChangeText).toHaveBeenLastCalledWith("Toyota");
  });

  it("shows the error instead of helper text", async () => {
    await render(
      <TextField error="Brand is required" helperText="Enter the manufacturer" label="Brand" />,
    );

    expect(screen.getByText("Brand is required")).toBeOnTheScreen();
    expect(screen.queryByText("Enter the manufacturer")).not.toBeOnTheScreen();
  });

  it("can be disabled", async () => {
    await render(<TextField editable={false} label="Brand" />);

    expect(screen.getByLabelText("Brand")).toBeDisabled();
  });

  it("centers a single-line value without native padding or extra line height", async () => {
    await render(<TextField label="Odometer" value="240" />);

    const input = screen.getByLabelText("Odometer");
    expect(input).toHaveProp("textAlignVertical", "center");
    expect(input).toHaveStyle({
      includeFontPadding: false,
      lineHeight: 16,
      paddingVertical: 0,
    });
  });
});
