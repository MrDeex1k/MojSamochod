import { render } from "@testing-library/react-native";
import { Text } from "react-native";

import { resolveWindowLayout, TabletWorkspace } from "./adaptive-workspace";

describe("resolveWindowLayout", () => {
  it.each([
    [393, 852, "phone-portrait"],
    [852, 393, "phone-landscape"],
    [768, 1024, "tablet-portrait"],
    [1024, 768, "tablet-landscape"],
    [900, 600, "tablet-landscape"],
    [900, 599, "phone-landscape"],
  ] as const)("resolves %d x %d as %s", (width, height, expected) => {
    expect(resolveWindowLayout(width, height)).toBe(expected);
  });
});

describe("AdaptiveWorkspace", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("applies native structural styles to the tablet workspace", async () => {
    const { getByTestId, getByText } = await render(
      <TabletWorkspace primaryPane={<Text>History</Text>} vehiclePane={<Text>Vehicle</Text>} />,
    );

    expect(getByText("History")).toBeTruthy();
    expect(getByText("Vehicle")).toBeTruthy();
    expect(getByTestId("tablet-workspace")).toHaveStyle({
      backgroundColor: "#121212",
      flex: 1,
      padding: 16,
    });
  });
});
