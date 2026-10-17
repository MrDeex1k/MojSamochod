import { fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NativeNavigationFrameContext } from "@/components/layout/native-navigation-context";
import { DocumentList } from "./document-list";

describe("DocumentList navigation", () => {
  it("can leave an empty document list without adding a document, including in a native stack", async () => {
    const onBack = jest.fn();
    const onAdd = jest.fn();
    await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { height: 844, width: 390, x: 0, y: 0 },
          insets: { bottom: 0, left: 0, right: 0, top: 0 },
        }}
      >
        <NativeNavigationFrameContext.Provider value>
          <DocumentList
            documents={[]}
            entries={[]}
            onAdd={onAdd}
            onBack={onBack}
            onSelect={jest.fn()}
          />
        </NativeNavigationFrameContext.Provider>
      </SafeAreaProvider>,
    );
    await fireEvent.press(screen.getByRole("button", { name: "Back to history" }));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onAdd).not.toHaveBeenCalled();
  });
});
