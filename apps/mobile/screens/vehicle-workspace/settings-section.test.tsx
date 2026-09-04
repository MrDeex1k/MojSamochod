import { render, screen, userEvent } from "@testing-library/react-native";
import { SettingsSection } from "./settings-section";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { appI18n } from "@/localization/i18n";
import { Alert } from "react-native";

describe("SettingsSection", () => {
  afterEach(async () => {
    await appI18n.changeLanguage("en");
  });
  it("provides Polish privacy information", async () => {
    await appI18n.changeLanguage("pl");
    await render(<SettingsSection embedded onBack={jest.fn()} onErase={jest.fn()} />);
    expect(screen.getByRole("header", { name: "Ustawienia i prywatność" })).toBeOnTheScreen();
    expect(
      screen.getByText(/Nie ma funkcji eksportu, importu ani odtwarzania bazy/),
    ).toBeOnTheScreen();
  });
  it.each([false, true])(
    "shows local-data guidance and navigates back (embedded=%s)",
    async (embedded) => {
      const onBack = jest.fn();
      await render(
        <SafeAreaProvider
          initialMetrics={{
            frame: { x: 0, y: 0, width: 390, height: 844 },
            insets: { top: 0, bottom: 0, left: 0, right: 0 },
          }}
        >
          <SettingsSection embedded={embedded} onBack={onBack} onErase={jest.fn()} />
        </SafeAreaProvider>,
      );
      expect(screen.getByRole("header", { name: "Settings and privacy" })).toBeOnTheScreen();
      expect(screen.getByText(/There is no database export/)).toBeOnTheScreen();
      expect(screen.getByText(/does not use your camera or microphone/)).toBeOnTheScreen();
      expect(screen.getAllByRole("button")).toHaveLength(2);
      await userEvent.press(screen.getByRole("button", { name: "Back to history" }));
      expect(onBack).toHaveBeenCalledTimes(1);
    },
  );
  it.each(["cancel", "destructive"])("requires explicit confirmation (%s)", async (choice) => {
    const onErase = jest.fn();
    jest.spyOn(Alert, "alert").mockImplementation((_title, _message, buttons) => {
      expect(onErase).not.toHaveBeenCalled();
      buttons?.find((button) => button.style === choice)?.onPress?.();
    });
    await render(<SettingsSection embedded onBack={jest.fn()} onErase={onErase} />);
    await userEvent.press(screen.getByRole("button", { name: "Erase all app data" }));
    expect(onErase).toHaveBeenCalledTimes(choice === "destructive" ? 1 : 0);
  });
});
