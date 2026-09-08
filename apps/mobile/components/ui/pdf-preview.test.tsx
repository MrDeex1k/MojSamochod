import { act, render, screen, userEvent, fireEvent, within } from "@testing-library/react-native";
import DocumentPreview from "@/modules/document-preview/src/DocumentPreviewModule";
import { PdfPreview } from "./pdf-preview";

const mockDelete = jest.fn();
jest.mock("expo-file-system", () => ({
  File: class {
    exists = true;
    delete = mockDelete;
  },
}));
jest.mock("@/modules/document-preview/src/DocumentPreviewModule", () => ({
  __esModule: true,
  default: { renderPage: jest.fn() },
}));
jest.mock("./navigation-surface", () => ({
  NavigationSurface: jest.requireActual("react-native").View,
  useNavigationMaterial: () => ({ supported: false, glass: false, interactive: false }),
}));
const renderPage = jest.mocked(DocumentPreview!.renderPage);
beforeEach(() => {
  jest.clearAllMocks();
  renderPage.mockImplementation(async (_uri, page) => ({
    uri: `file:///preview-${page}.png`,
    pageCount: 2,
    text: `PDF page ${page + 1}`,
  }));
});

it("preserves the page across fullscreen, bounds zoom and closes with Android back", async () => {
  await render(<PdfPreview uri="file:///document.pdf" name="Invoice" />);
  await screen.findByText("Page 1 of 2");
  await userEvent.press(screen.getByRole("button", { name: "Next page" }));
  await screen.findByText("Page 2 of 2");
  await userEvent.press(screen.getByRole("button", { name: "View full screen" }));
  expect(
    within(screen.getByTestId("pdf-fullscreen")).getByRole("button", { name: "Next page" }),
  ).toBeDisabled();
  expect(screen.getByRole("button", { name: "Zoom out" })).toBeDisabled();
  for (let i = 0; i < 4; i++)
    await userEvent.press(screen.getByRole("button", { name: "Zoom in" }));
  expect(screen.getByText("300% · Fit page")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Zoom in" })).toBeDisabled();
  await userEvent.press(screen.getByRole("button", { name: "Fit page" }));
  expect(screen.getByText("100% · Fit page")).toBeOnTheScreen();
  await fireEvent(screen.getByTestId("pdf-fullscreen"), "requestClose");
  expect(screen.queryByRole("button", { name: "Close preview" })).toBeNull();
  expect(screen.getByText("Page 2 of 2")).toBeOnTheScreen();
  expect(renderPage).toHaveBeenCalledTimes(2);
});

it("resets a different document to page one and removes late native renders", async () => {
  let finish!: (result: { uri: string; pageCount: number; text: string }) => void;
  renderPage.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const view = await render(<PdfPreview uri="file:///old.pdf" name="Old" />);
  await view.rerender(<PdfPreview uri="file:///new.pdf" name="New" />);
  await screen.findByText("Page 1 of 2");
  await act(async () => finish({ uri: "file:///late.png", pageCount: 5, text: "Old content" }));
  expect(mockDelete).toHaveBeenCalledTimes(1);
  expect(screen.queryByLabelText("Old content")).toBeNull();
  expect(renderPage).toHaveBeenLastCalledWith("file:///new.pdf", 0);
  await view.unmount();
  expect(mockDelete).toHaveBeenCalledTimes(2);
});

it("can return from a failed page in fullscreen without trapping the reader", async () => {
  await render(<PdfPreview uri="file:///document.pdf" name="Invoice" />);
  await screen.findByText("Page 1 of 2");
  await userEvent.press(screen.getByRole("button", { name: "View full screen" }));
  const modal = within(screen.getByTestId("pdf-fullscreen"));
  renderPage.mockRejectedValueOnce(new Error("Native render failed"));
  await userEvent.press(modal.getByRole("button", { name: "Next page" }));
  expect(await modal.findByRole("alert")).toHaveTextContent(
    "Could not display this PDF. Try again.",
  );
  await userEvent.press(modal.getByRole("button", { name: "Previous page" }));
  expect(await modal.findByLabelText("PDF page 1")).toBeOnTheScreen();
  expect(screen.queryByRole("alert")).toBeNull();
});

it("can skip forward from a failed page in fullscreen", async () => {
  await render(<PdfPreview uri="file:///document.pdf" name="Invoice" />);
  await screen.findByText("Page 1 of 2");
  await userEvent.press(screen.getByRole("button", { name: "Next page" }));
  await screen.findByText("Page 2 of 2");
  await userEvent.press(screen.getByRole("button", { name: "View full screen" }));
  const modal = within(screen.getByTestId("pdf-fullscreen"));
  renderPage.mockRejectedValueOnce(new Error("Native render failed"));
  await userEvent.press(modal.getByRole("button", { name: "Previous page" }));
  expect(await modal.findByRole("alert")).toHaveTextContent(
    "Could not display this PDF. Try again.",
  );
  await userEvent.press(modal.getByRole("button", { name: "Next page" }));
  expect(await modal.findByLabelText("PDF page 2")).toBeOnTheScreen();
  expect(screen.queryByRole("alert")).toBeNull();
});
