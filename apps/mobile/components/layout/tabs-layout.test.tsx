import { render, screen, userEvent } from "@testing-library/react-native";
import { useRouter } from "expo-router";
import * as Native from "react-native";
import TabsLayout from "@/app/vehicle/(tabs)/_layout";

jest.mock("react-native", () => {
  const native = jest.requireActual("react-native");
  return Object.defineProperties(
    {},
    {
      ...Object.getOwnPropertyDescriptors(native),
      Platform: { value: { ...native.Platform, OS: "android" }, enumerable: true },
      useWindowDimensions: { value: jest.fn(), enumerable: true },
    },
  );
});

jest.mock("expo-router", () => ({
  usePathname: () => "/vehicle/overview",
  useRouter: jest.fn(),
  router: {
    navigate: () => {
      throw new Error("The imperative router is unavailable before the first render has finished.");
    },
  },
}));

jest.mock("expo-router/native-tabs", () => {
  const NativeTabs = () => null;
  NativeTabs.Trigger = Object.assign(() => null, { Icon: () => null, Label: () => null });
  return { NativeTabs };
});

jest.mock("@/components/layout/material-navigation-rail", () => {
  const { Button, View } = jest.requireActual("react-native");
  return {
    MaterialNavigationRail: ({
      labels,
      onSelect,
    }: {
      labels: string[];
      onSelect: (index: number) => void;
    }) => (
      <View>
        {labels.map((label, index) => (
          <Button key={label} title={label} onPress={() => onSelect(index)} />
        ))}
      </View>
    ),
  };
});

it("uses the current router root after switching from tabs to the tablet rail", async () => {
  const dimensions = jest.mocked(Native.useWindowDimensions);
  dimensions.mockReturnValue({ width: 800, height: 1280, scale: 2, fontScale: 1.6 });
  const previousRoot = { navigate: jest.fn() };
  const currentRoot = { navigate: jest.fn() };
  jest.mocked(useRouter).mockReturnValue(previousRoot as unknown as ReturnType<typeof useRouter>);
  const view = await render(<TabsLayout />);
  dimensions.mockReturnValue({ width: 1280, height: 800, scale: 2, fontScale: 1.6 });
  jest.mocked(useRouter).mockReturnValue(currentRoot as unknown as ReturnType<typeof useRouter>);
  await view.rerender(<TabsLayout />);

  await userEvent.press(screen.getByRole("button", { name: "Settings" }));

  expect(currentRoot.navigate).toHaveBeenCalledWith("/vehicle/(tabs)/settings");
  expect(previousRoot.navigate).not.toHaveBeenCalled();
});
