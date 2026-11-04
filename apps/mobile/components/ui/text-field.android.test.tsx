import { render, screen } from "@testing-library/react-native";
import { TextField } from "./text-field.android";

jest.mock("@expo/ui/jetpack-compose", () => {
  const { View, Text } = jest.requireActual("react-native");
  const OutlinedTextField = ({ children }: { children: React.ReactNode }) => (
    <View>{children}</View>
  );
  OutlinedTextField.Label = View;
  OutlinedTextField.Placeholder = View;
  OutlinedTextField.SupportingText = View;
  return {
    OutlinedTextField,
    Text,
    useNativeState: (value: string) => ({ get: () => value, set: jest.fn() }),
  };
});

it("renders vehicle setup examples alongside their field labels", async () => {
  await render(
    <>
      <TextField label="Make" placeholder="e.g. Toyota" />
      <TextField label="Model" placeholder="e.g. Corolla" />
    </>,
  );

  expect(screen.getByText("Make")).toBeOnTheScreen();
  expect(screen.getByText("Model")).toBeOnTheScreen();
  expect(screen.getByText("e.g. Toyota")).toBeOnTheScreen();
  expect(screen.getByText("e.g. Corolla")).toBeOnTheScreen();
});

it("keeps the validation message when a placeholder is present", async () => {
  await render(<TextField label="Make" placeholder="e.g. Toyota" error="Enter a make" />);

  expect(screen.getByText("e.g. Toyota")).toBeOnTheScreen();
  expect(screen.getByText("Enter a make")).toBeOnTheScreen();
});
