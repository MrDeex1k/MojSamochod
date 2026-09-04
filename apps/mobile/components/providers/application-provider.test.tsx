import { render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { Text, Pressable } from "react-native";
import { ApplicationProvider, useApplicationServices } from "./application-provider";

const mockResume = jest.fn();
const mockErase = jest.fn();
const mockReconcile = jest.fn();
const mockLifecycle = jest.fn(() => jest.fn());
const mockCreate = jest.fn((_database: unknown, eraseAllData: () => void) => ({
  services: { eraseAllData, managedFiles: { reconcile: mockReconcile }, reminderSchedule: {} },
  reset: { resumeIfPending: mockResume, erase: mockErase },
}));
jest.mock("@/infrastructure/application-runtime", () => ({
  createApplicationRuntime: (...args: Parameters<typeof mockCreate>) => mockCreate(...args),
}));
jest.mock("./database-provider", () => ({ useDatabase: () => ({}) }));
jest.mock("@/infrastructure/notifications/reminder-schedule-lifecycle", () => ({
  startReminderScheduleLifecycle: () => mockLifecycle(),
}));
jest.mock("@/components/layout/screen", () => ({
  Screen: ({ children }: { children: React.ReactNode }) => children,
}));

function Content() {
  const { eraseAllData } = useApplicationServices();
  return (
    <Pressable accessibilityRole="button" onPress={eraseAllData}>
      <Text>Confirmed reset</Text>
    </Pressable>
  );
}
beforeEach(() => {
  mockResume.mockResolvedValue(false);
  mockErase.mockResolvedValue(undefined);
  mockReconcile.mockResolvedValue({ ok: true });
});
it("checks the reset marker before accessing records or scheduling", async () => {
  await render(
    <ApplicationProvider>
      <Content />
    </ApplicationProvider>,
  );
  expect(await screen.findByRole("button", { name: "Confirmed reset" })).toBeOnTheScreen();
  expect(mockResume.mock.invocationCallOrder[0]).toBeLessThan(
    mockReconcile.mock.invocationCallOrder[0]!,
  );
  expect(mockReconcile.mock.invocationCallOrder[0]).toBeLessThan(
    mockLifecycle.mock.invocationCallOrder[0]!,
  );
});
it("recreates services after resuming an interrupted reset", async () => {
  mockResume.mockResolvedValueOnce(true);
  await render(
    <ApplicationProvider>
      <Content />
    </ApplicationProvider>,
  );
  expect(await screen.findByRole("button", { name: "Confirmed reset" })).toBeOnTheScreen();
  expect(mockCreate).toHaveBeenCalledTimes(2);
  expect(mockReconcile).toHaveBeenCalledTimes(1);
});
it("does not treat a marker read error as authorization to erase", async () => {
  mockResume.mockRejectedValueOnce(new Error("SQLITE_BUSY"));
  await render(
    <ApplicationProvider>
      <Content />
    </ApplicationProvider>,
  );
  expect(await screen.findByRole("button", { name: "Try again" })).toBeOnTheScreen();
  await userEvent.press(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByRole("button", { name: "Confirmed reset" })).toBeOnTheScreen();
  expect(mockErase).not.toHaveBeenCalled();
});
it("blocks the old UI on failure and retries the confirmed reset", async () => {
  mockErase.mockRejectedValueOnce(new Error("ENOSPC"));
  await render(
    <ApplicationProvider>
      <Content />
    </ApplicationProvider>,
  );
  await userEvent.press(await screen.findByRole("button", { name: "Confirmed reset" }));
  expect(await screen.findByText(/Data erasure could not finish/)).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: "Confirmed reset" })).not.toBeOnTheScreen();
  await userEvent.press(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByRole("button", { name: "Confirmed reset" })).toBeOnTheScreen();
  await waitFor(() => expect(mockErase).toHaveBeenCalledTimes(2));
  expect(mockCreate).toHaveBeenCalledTimes(2);
});
