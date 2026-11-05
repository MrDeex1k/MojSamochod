import { act, render, screen, userEvent, fireEvent, within } from "@testing-library/react-native";
import DocumentPreview from "@/modules/document-preview/src/DocumentPreviewModule";
import { PdfPreview } from "./pdf-preview";
import { AdaptiveWorkspace } from "../layout/adaptive-workspace";
import * as Native from "react-native";

jest.mock("react-native", () => {
  const native = jest.requireActual("react-native");
  return Object.defineProperties(
    {},
    {
      ...Object.getOwnPropertyDescriptors(native),
      useWindowDimensions: { value: jest.fn(native.useWindowDimensions), enumerable: true },
    },
  );
});

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
  jest.useFakeTimers({ legacyFakeTimers: true });
  const user = userEvent.setup();
  try {
    await render(<PdfPreview uri="file:///document.pdf" name="Invoice" />);
    await screen.findByText("Page 1 of 2");
    await user.press(screen.getByRole("button", { name: "Next page" }));
    await screen.findByText("Page 2 of 2");
    await user.press(screen.getByRole("button", { name: "View full screen" }));
    expect(
      within(screen.getByTestId("pdf-fullscreen")).getByRole("button", { name: "Next page" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Zoom out" })).toBeDisabled();
    for (let i = 0; i < 4; i++) await user.press(screen.getByRole("button", { name: "Zoom in" }));
    expect(screen.getByText("300% · Fit page")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Zoom in" })).toBeDisabled();
    await user.press(screen.getByRole("button", { name: "Fit page" }));
    expect(screen.getByText("100% · Fit page")).toBeOnTheScreen();
    await fireEvent(screen.getByTestId("pdf-fullscreen"), "requestClose");
    expect(screen.queryByRole("button", { name: "Close preview" })).toBeNull();
    expect(screen.getByText("Page 2 of 2")).toBeOnTheScreen();
    expect(renderPage).toHaveBeenCalledTimes(2);
  } finally {
    jest.useRealTimers();
  }
});

it("keeps the same open page and zoom when a fold changes the workspace layout", async () => {
  const dimensions = jest.mocked(Native.useWindowDimensions);
  const workspace = () => {
    const pdf = <PdfPreview uri="file:///document.pdf" name="Invoice" />;
    return <AdaptiveWorkspace list={<Native.Text>Documents</Native.Text>}>{pdf}</AdaptiveWorkspace>;
  };
  try {
    dimensions.mockReturnValue({ width: 1000, height: 800, scale: 1, fontScale: 1 });
    const view = await render(workspace());
    expect(screen.getByText("Documents")).toBeOnTheScreen();
    await screen.findByText("Page 1 of 2");
    await userEvent.press(screen.getByRole("button", { name: "Next page" }));
    await screen.findByText("Page 2 of 2");
    await userEvent.press(screen.getByRole("button", { name: "View full screen" }));
    await userEvent.press(screen.getByRole("button", { name: "Zoom in" }));
    for (const width of [380, 720, 1000]) {
      dimensions.mockReturnValue({ width, height: 800, scale: 1, fontScale: 1 });
      await view.rerender(workspace());
      expect(Boolean(screen.queryByText("Documents"))).toBe(width >= 688);
      const modal = within(screen.getByTestId("pdf-fullscreen"));
      expect(modal.getByText("Page 2 of 2")).toBeOnTheScreen();
      expect(modal.getByText("150% · Fit page")).toBeOnTheScreen();
    }
    expect(renderPage).toHaveBeenCalledTimes(2);
  } finally {
    dimensions.mockImplementation(jest.requireActual("react-native").useWindowDimensions);
  }
});

it("restores both scroll offsets after resizing and keeps the top after a status bar tap", async () => {
  await render(<PdfPreview uri="file:///document.pdf" name="Invoice" />);
  await screen.findByText("Page 1 of 2");
  await userEvent.press(screen.getByRole("button", { name: "View full screen" }));
  const viewport = screen.getByTestId("pdf-viewport");
  const layout = (width: number, height: number) =>
    fireEvent(viewport, "layout", { nativeEvent: { layout: { x: 0, y: 0, width, height } } });
  await layout(374, 524);
  for (let i = 0; i < 2; i++)
    await userEvent.press(screen.getByRole("button", { name: "Zoom in" }));

  const horizontal = screen.getByTestId("pdf-scroll-x");
  const vertical = screen.getByTestId("pdf-scroll-y");
  const nativeEvent = {
    contentSize: { width: 700, height: 1000 },
    layoutMeasurement: { width: 374, height: 524 },
    contentOffset: { x: 163, y: 438 },
  };
  for (const scroll of [horizontal, vertical]) {
    await fireEvent(scroll, "scrollBeginDrag", { nativeEvent });
    await fireEvent.scroll(scroll, { nativeEvent });
    await fireEvent(scroll, "scrollEndDrag", { nativeEvent });
  }
  const scrollTo = jest.mocked(Native.ScrollView.prototype.scrollTo);
  await layout(304, 424);
  expect(scrollTo).toHaveBeenCalledWith({ x: 128, animated: false });
  expect(scrollTo).toHaveBeenCalledWith({ y: 348, animated: false });

  expect(horizontal.props.scrollsToTop).toBe(false);
  expect(vertical.props.scrollsToTop).toBe(true);
  await fireEvent(vertical, "scrollToTop", {
    nativeEvent: { ...nativeEvent, contentOffset: { x: 0, y: 0 } },
  });
  scrollTo.mockClear();
  await layout(374, 524);
  expect(scrollTo).toHaveBeenCalledWith({ x: 163, animated: false });
  expect(scrollTo).toHaveBeenCalledWith({ y: 0, animated: false });
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
