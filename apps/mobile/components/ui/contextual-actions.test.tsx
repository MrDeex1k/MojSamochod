import { render, screen, userEvent } from "@testing-library/react-native";

import { ContextualActions } from "./contextual-actions";

jest.mock("./navigation-surface", () => ({
  NavigationSurface: jest.requireActual("react-native").View,
  useNavigationMaterial: () => ({ supported: false, glass: false, interactive: false }),
}));

const props = {
  cancelLabel: "Cancel",
  deleteLabel: "Delete entry",
  editLabel: "Edit",
  menuLabel: "More actions",
  menuTitle: "Entry actions",
  onDelete: jest.fn(),
  onEdit: jest.fn(),
};

beforeEach(() => jest.clearAllMocks());

it("keeps editing visible and moves destructive work behind the action menu", async () => {
  await render(<ContextualActions {...props} />);

  await userEvent.press(screen.getByRole("button", { name: "Edit" }));
  expect(props.onEdit).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("button", { name: "Delete entry" })).toBeNull();

  await userEvent.press(screen.getByRole("button", { name: "More actions" }));
  await userEvent.press(screen.getByRole("button", { name: "Delete entry" }));
  expect(props.onDelete).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("button", { name: "Delete entry" })).toBeNull();
});

it("disables edit and menu actions together", async () => {
  await render(<ContextualActions {...props} disabled />);

  expect(screen.getByRole("button", { name: "Edit" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "More actions" })).toBeDisabled();
});
