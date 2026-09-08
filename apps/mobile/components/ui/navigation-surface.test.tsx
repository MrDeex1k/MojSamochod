import { act, render, screen, userEvent } from "@testing-library/react-native";
import { useState } from "react";
import { AccessibilityInfo, Platform, TextInput } from "react-native";
import { isGlassEffectAPIAvailable, isLiquidGlassAvailable } from "expo-glass-effect";
import { NavigationSurface, useNavigationMaterial } from "./navigation-surface";

jest.mock("expo-glass-effect", () => ({
  GlassView: jest.requireActual("react-native").View,
  isGlassEffectAPIAvailable: jest.fn(),
  isLiquidGlassAvailable: jest.fn(),
}));

function Harness() {
  const material = useNavigationMaterial();
  const [draft, setDraft] = useState("");
  return (
    <NavigationSurface material={material}>
      <TextInput accessibilityLabel="Draft" value={draft} onChangeText={setDraft} />
    </NavigationSurface>
  );
}

const listeners = new Map<string, () => void>();
const originalPlatform = Platform.OS;
beforeEach(() => {
  Platform.OS = "ios";
  jest.mocked(isGlassEffectAPIAvailable).mockReturnValue(true);
  jest.mocked(isLiquidGlassAvailable).mockReturnValue(true);
  jest.spyOn(AccessibilityInfo, "isReduceTransparencyEnabled").mockResolvedValue(false);
  jest.spyOn(AccessibilityInfo, "isDarkerSystemColorsEnabled").mockResolvedValue(false);
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(false);
  jest.spyOn(AccessibilityInfo, "addEventListener").mockImplementation((event, listener) => {
    listeners.set(event, () => listener({} as never));
    return {
      remove: () => {
        listeners.delete(event);
      },
    } as ReturnType<typeof AccessibilityInfo.addEventListener>;
  });
});
afterEach(() => {
  Platform.OS = originalPlatform;
  jest.restoreAllMocks();
  jest.clearAllMocks();
  listeners.clear();
});

it.each(["android", "web"] as const)(
  "does not access iOS availability APIs on %s",
  async (platform) => {
    Platform.OS = platform;
    await render(<Harness />);
    expect(screen.queryByTestId("navigation-glass", { includeHiddenElements: true })).toBeNull();
    expect(screen.getByTestId("navigation-opaque")).toBeTruthy();
    expect(isGlassEffectAPIAvailable).not.toHaveBeenCalled();
  },
);

it.each([
  [false, true],
  [true, false],
])("uses an opaque surface when runtime=%s and design=%s", async (runtime, design) => {
  jest.mocked(isGlassEffectAPIAvailable).mockReturnValue(runtime);
  jest.mocked(isLiquidGlassAvailable).mockReturnValue(design);
  await render(<Harness />);
  expect(screen.queryByTestId("navigation-glass", { includeHiddenElements: true })).toBeNull();
});

it.each([
  ["isReduceTransparencyEnabled", "reduceTransparencyChanged"],
  ["isDarkerSystemColorsEnabled", "darkerSystemColorsChanged"],
] as const)("reacts to %s without losing the draft", async (query, event) => {
  const view = await render(<Harness />);
  expect(screen.getByTestId("navigation-glass", { includeHiddenElements: true })).toBeTruthy();
  await userEvent.type(screen.getByLabelText("Draft"), "Oil service");
  jest.mocked(AccessibilityInfo[query]).mockResolvedValue(true);
  await act(async () => {
    listeners.get(event)?.();
  });
  expect(screen.queryByTestId("navigation-glass", { includeHiddenElements: true })).toBeNull();
  expect(screen.getByLabelText("Draft")).toHaveDisplayValue("Oil service");
  jest.mocked(AccessibilityInfo[query]).mockResolvedValue(false);
  await act(async () => {
    listeners.get(event)?.();
  });
  expect(screen.getByTestId("navigation-glass", { includeHiddenElements: true })).toBeTruthy();
  expect(screen.getByLabelText("Draft")).toHaveDisplayValue("Oil service");
  await view.unmount();
  expect(listeners.size).toBe(0);
});

it("disables interactive effects with Reduce Motion", async () => {
  jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValue(true);
  await render(<Harness />);
  expect(
    screen.getByTestId("navigation-glass", { includeHiddenElements: true }).props.isInteractive,
  ).toBe(false);
});

it("stays opaque if accessibility preferences cannot be read", async () => {
  jest
    .mocked(AccessibilityInfo.isReduceTransparencyEnabled)
    .mockRejectedValue(new Error("Unavailable"));
  await render(<Harness />);
  expect(screen.queryByTestId("navigation-glass", { includeHiddenElements: true })).toBeNull();
});
