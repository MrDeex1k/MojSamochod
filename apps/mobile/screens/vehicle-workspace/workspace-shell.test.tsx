import { act, fireEvent, render, screen, userEvent } from "@testing-library/react-native";
import { useState, type ComponentProps } from "react";
import * as Native from "react-native";

jest.mock("react-native/Libraries/Utilities/useWindowDimensions", () => ({
  __esModule: true,
  default: jest.fn(),
}));
import { Keyboard, Text, TextInput } from "react-native";
import { useNavigationInset } from "@/components/layout/navigation-inset";
import { useNavigationMaterial } from "@/components/ui/navigation-surface";
import { WorkspaceShell } from "./workspace-shell";

jest.mock("@/components/ui/navigation-surface", () => ({
  useNavigationMaterial: jest.fn(),
  NavigationSurface: jest.requireActual("react-native").View,
}));
jest.mock("react-native-safe-area-context", () => ({
  ...jest.requireActual("react-native-safe-area-context/jest/mock").default,
  useSafeAreaInsets: () => ({ top: 62, bottom: 34, left: 0, right: 0 }),
}));

const props = {
  vehicle: { make: "Volvo", model: "V60" },
  mode: { kind: "history" },
  onFuel: jest.fn(),
  onDocuments: jest.fn(),
  onCancelFlow: jest.fn(),
  onReminders: jest.fn(),
  onEditVehicle: jest.fn(),
  onDataManagement: jest.fn(),
} as ComponentProps<typeof WorkspaceShell>;
const keyboardListeners = new Map<string, () => void>();
function Draft() {
  const [draft, setDraft] = useState("");
  const inset = useNavigationInset();
  return (
    <>
      <Text testID="navigation-inset">{inset}</Text>
      <TextInput accessibilityLabel="Draft" value={draft} onChangeText={setDraft} />
    </>
  );
}

beforeEach(() => {
  jest
    .mocked(useNavigationMaterial)
    .mockReturnValue({ supported: true, glass: true, interactive: false });
  jest
    .spyOn(Native, "useWindowDimensions")
    .mockReturnValue({ width: 402, height: 874, scale: 1, fontScale: 1 });
  jest.spyOn(Keyboard, "isVisible").mockReturnValue(false);
  jest.spyOn(Keyboard, "addListener").mockImplementation((event, listener) => {
    keyboardListeners.set(event, () => listener({} as never));
    return {
      remove: () => {
        keyboardListeners.delete(event);
      },
    } as ReturnType<typeof Keyboard.addListener>;
  });
});
afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  keyboardListeners.clear();
});

it("reserves the measured floating bar and home indicator, hiding it for the keyboard without losing a draft", async () => {
  const view = await render(
    <WorkspaceShell {...props}>
      <Draft />
    </WorkspaceShell>,
  );
  expect(screen.getByTestId("workspace-navigation")).toHaveStyle({
    position: "absolute",
    bottom: 34,
  });
  await fireEvent(screen.getByTestId("workspace-navigation"), "layout", {
    nativeEvent: { layout: { height: 98 } },
  });
  expect(screen.getByTestId("navigation-inset")).toHaveTextContent("114");
  await userEvent.type(screen.getByLabelText("Draft"), "Oil service");
  await act(() => {
    keyboardListeners.get("keyboardWillShow")?.();
  });
  expect(screen.queryAllByRole("tab")).toHaveLength(0);
  expect(screen.getByTestId("navigation-inset")).toHaveTextContent("0");
  await act(() => {
    keyboardListeners.get("keyboardWillHide")?.();
  });
  expect(screen.getAllByRole("tab")).toHaveLength(4);
  expect(screen.getByLabelText("Draft")).toHaveDisplayValue("Oil service");
  expect(screen.getByTestId("navigation-inset")).toHaveTextContent("114");
  await view.unmount();
  expect(keyboardListeners.size).toBe(0);
});

it("reserves a separate navigation row on tablets and in editors", async () => {
  jest
    .mocked(Native.useWindowDimensions)
    .mockReturnValue({ width: 820, height: 1180, scale: 1, fontScale: 1 });
  const view = await render(
    <WorkspaceShell {...props}>
      <Draft />
    </WorkspaceShell>,
  );
  expect(screen.getByTestId("workspace-navigation")).not.toHaveStyle({ position: "absolute" });
  expect(screen.getByTestId("navigation-inset")).toHaveTextContent("0");
  jest
    .mocked(Native.useWindowDimensions)
    .mockReturnValue({ width: 402, height: 874, scale: 1, fontScale: 1 });
  await view.rerender(
    <WorkspaceShell {...props} mode={{ kind: "vehicle-form", returnTo: "fuel" }}>
      <Draft />
    </WorkspaceShell>,
  );
  expect(screen.getByTestId("workspace-navigation")).not.toHaveStyle({ position: "absolute" });
  await userEvent.press(screen.getByRole("button", { name: "Back" }));
  expect(props.onFuel).toHaveBeenCalledTimes(1);
});

it("keeps the original navigation layout and callbacks when native glass is unavailable", async () => {
  jest
    .mocked(useNavigationMaterial)
    .mockReturnValue({ supported: false, glass: false, interactive: false });
  await render(
    <WorkspaceShell {...props}>
      <Draft />
    </WorkspaceShell>,
  );
  expect(screen.getByTestId("workspace-navigation")).not.toHaveStyle({ position: "absolute" });
  expect(screen.getByTestId("navigation-inset")).toHaveTextContent("0");
  await userEvent.press(screen.getByRole("tab", { name: "Documents" }));
  expect(props.onDocuments).toHaveBeenCalledTimes(1);
});
