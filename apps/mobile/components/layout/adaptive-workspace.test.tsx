import { render, screen, userEvent } from "@testing-library/react-native";
import { useState } from "react";
import * as Native from "react-native";
import { Text, TextInput } from "react-native";

import { AdaptiveWorkspace, resolveWindowLayout, TabletWorkspace } from "./adaptive-workspace";

function Draft() {
  const [text, setText] = useState("");
  return <TextInput accessibilityLabel="Draft" value={text} onChangeText={setText} />;
}

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
  it.each([
    [393, 852],
    [820, 1180],
  ])("preserves a draft across rotation at %d × %d", async (width, height) => {
    const dimensions = jest.spyOn(Native, "useWindowDimensions");
    dimensions.mockReturnValue({ width, height, scale: 1, fontScale: 1 });
    const workspace = (
      <AdaptiveWorkspace
        phone={<Draft />}
        primaryPane={<Draft />}
        vehiclePane={<Text>Vehicle</Text>}
      />
    );
    const view = await render(workspace);
    await userEvent.type(screen.getByLabelText("Draft"), "Oil service");
    dimensions.mockReturnValue({ width: height, height: width, scale: 1, fontScale: 1 });
    await view.rerender(
      <AdaptiveWorkspace
        phone={<Draft />}
        primaryPane={<Draft />}
        vehiclePane={<Text>Vehicle</Text>}
      />,
    );
    expect(screen.getByLabelText("Draft")).toHaveDisplayValue("Oil service");
  });
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
