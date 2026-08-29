import { render, screen, userEvent } from "@testing-library/react-native";

import { EmptyState } from "./empty-state";
import { ErrorState } from "./error-state";
import { LoadingState } from "./loading-state";

describe("application states", () => {
  it("announces loading progress", async () => {
    await render(<LoadingState label="Loading vehicle history" />);

    expect(screen.getByRole("progressbar", { name: "Loading vehicle history" })).toBeOnTheScreen();
  });

  it("allows the empty-state action", async () => {
    const onAction = jest.fn();

    await render(<EmptyState actionLabel="Add entry" onAction={onAction} title="No entries" />);
    await userEvent.press(screen.getByRole("button", { name: "Add entry" }));

    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("announces errors", async () => {
    await render(<ErrorState description="Try again" title="Could not load entries" />);

    expect(screen.getByRole("alert")).toBeOnTheScreen();
    expect(screen.getByText("Could not load entries")).toBeOnTheScreen();
    expect(screen.getByText("Try again")).toBeOnTheScreen();
  });
});
