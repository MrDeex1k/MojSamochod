import { render, screen, userEvent, waitFor } from "@testing-library/react-native";
import type { ReactElement } from "react";
import { Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import type { AppDatabase, DatabaseHandle } from "@/infrastructure/database/database";

import { DatabaseProvider } from "./database-provider";

const initialMetrics = {
  frame: { height: 852, width: 393, x: 0, y: 0 },
  insets: { bottom: 34, left: 0, right: 0, top: 47 },
};

function renderWithSafeArea(element: ReactElement) {
  return render(<SafeAreaProvider initialMetrics={initialMetrics}>{element}</SafeAreaProvider>);
}

function createDatabaseHandle(): DatabaseHandle {
  return {
    close: jest.fn().mockResolvedValue(undefined),
    database: {} as AppDatabase,
  };
}

describe("DatabaseProvider", () => {
  it("keeps application content hidden while the database is being prepared", async () => {
    const initialize = jest.fn(() => new Promise<DatabaseHandle>(() => undefined));

    await renderWithSafeArea(
      <DatabaseProvider initialize={initialize}>
        <Text>Vehicle history</Text>
      </DatabaseProvider>,
    );

    expect(screen.getByRole("progressbar", { name: "Preparing data" })).toBeOnTheScreen();
    expect(screen.queryByText("Vehicle history")).not.toBeOnTheScreen();
  });

  it("renders application content after migrations finish and closes the database on unmount", async () => {
    const handle = createDatabaseHandle();
    const initialize = jest.fn().mockResolvedValue(handle);
    const view = await renderWithSafeArea(
      <DatabaseProvider initialize={initialize}>
        <Text>Vehicle history</Text>
      </DatabaseProvider>,
    );

    expect(await screen.findByText("Vehicle history")).toBeOnTheScreen();

    await view.unmount();
    await waitFor(() => expect(handle.close).toHaveBeenCalledTimes(1));
  });

  it("shows a recoverable error and retries initialization", async () => {
    const user = userEvent.setup();
    const handle = createDatabaseHandle();
    const initialize = jest
      .fn<Promise<DatabaseHandle>, []>()
      .mockRejectedValueOnce(new Error("Migration failed"))
      .mockResolvedValueOnce(handle);

    await renderWithSafeArea(
      <DatabaseProvider initialize={initialize}>
        <Text>Vehicle history</Text>
      </DatabaseProvider>,
    );

    expect(await screen.findByRole("alert")).toBeOnTheScreen();
    expect(screen.queryByText("Migration failed")).not.toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Vehicle history")).toBeOnTheScreen();
    expect(initialize).toHaveBeenCalledTimes(2);
  });
});
