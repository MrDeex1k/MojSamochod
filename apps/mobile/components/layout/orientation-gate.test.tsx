import { useState } from "react";
import { TextInput } from "react-native";
import { render, screen, userEvent } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { OrientationGate } from "./orientation-gate";

function Draft() {
  const [value, setValue] = useState("");
  return <TextInput accessibilityLabel="Draft" value={value} onChangeText={setValue} />;
}
function Layout({ blocked }: { blocked: boolean }) {
  return (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, bottom: 0, left: 0, right: 0 },
      }}
    >
      <OrientationGate blocked={blocked} phone>
        <Draft />
      </OrientationGate>
    </SafeAreaProvider>
  );
}
it("preserves a draft across a blocked orientation while hiding it from accessibility", async () => {
  const view = await render(<Layout blocked={false} />);
  await userEvent.type(screen.getByLabelText("Draft"), "Keep this draft");
  await view.rerender(<Layout blocked />);
  expect(screen.queryByLabelText("Draft")).toBeNull();
  await view.rerender(<Layout blocked={false} />);
  expect(screen.getByLabelText("Draft")).toHaveDisplayValue("Keep this draft");
});
