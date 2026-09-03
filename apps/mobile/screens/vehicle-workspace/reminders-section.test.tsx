import { act, render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { Alert, Platform } from "react-native";
import { ReminderService } from "@/application/reminders/reminder-service";
import type { ReminderRepository } from "@/application/repositories/reminder-repository";
import { repositoryFailure, repositorySuccess } from "@/application/repositories/repository-result";
import { ReminderSchedule } from "@/application/notifications/reminder-schedule";
import type { ReminderNotifications } from "@/application/notifications/reminder-notifications";
import { scheduleAwareReminderRepository } from "@/application/notifications/schedule-aware-repositories";
import { createDevelopmentVehicleHistoryFixture } from "@/development/fixtures/vehicle-history";
import { createReminder, type Reminder } from "@/domain/reminders/reminder";
import { appI18n } from "@/localization/i18n";
import { RemindersSection } from "./reminders-section";

jest.mock("@react-native-community/datetimepicker", () => {
  const { Button, View } = jest.requireActual("react-native");
  return function Picker({
    onValueChange,
    onDismiss,
    timeZoneName,
    mode,
  }: {
    onValueChange: (event: unknown, date: Date) => void;
    onDismiss: () => void;
    timeZoneName: string;
    mode: string;
  }) {
    return (
      <View>
        <Button
          accessibilityLabel={`Pick date (${mode}, ${timeZoneName})`}
          title={`Pick date (${mode}, ${timeZoneName})`}
          onPress={() => onValueChange({}, new Date("2026-12-01T12:00:00.000Z"))}
        />
        <Button title="Dismiss native picker" onPress={onDismiss} />
      </View>
    );
  };
});

const vehicle = createDevelopmentVehicleHistoryFixture().vehicle;
const now = new Date("2026-09-04T10:00:00.000Z");
const clock = { now: () => now };
const identity = { generate: () => "018f47e2-7b35-7658-b336-34613389d00f" };
function fixture(dueDate = "2026-12-01", timeZone = "Europe/Warsaw") {
  const value = createReminder(
    { vehicleId: vehicle.id, kind: "insurance", dueDate, timeZone },
    { clock, idGenerator: identity },
  );
  if (!value.ok) throw new Error("Invalid fixture");
  return value.value;
}
async function setup(records: readonly Reminder[] = [], canSchedule = false, embedded = true) {
  let stored = [...records];
  const repository: jest.Mocked<ReminderRepository> = {
    list: jest.fn().mockImplementation(async () => repositorySuccess(stored)),
    get: jest
      .fn()
      .mockImplementation(async (_owner, id) =>
        repositorySuccess(stored.find((item) => item.id === id) ?? null),
      ),
    create: jest.fn().mockImplementation(async (value: Reminder) => {
      stored.push(value);
      return repositorySuccess(undefined);
    }),
    update: jest.fn().mockImplementation(async (value: Reminder) => {
      stored = stored.map((item) => (item.id === value.id ? value : item));
      return repositorySuccess(undefined);
    }),
    delete: jest.fn().mockImplementation(async (_owner, id) => {
      stored = stored.filter((item) => item.id !== id);
      return repositorySuccess(undefined);
    }),
  };
  const notifications: jest.Mocked<ReminderNotifications> = {
    getPermission: jest.fn().mockResolvedValue({
      ok: true,
      value: {
        status: canSchedule ? "granted" : "undetermined",
        canSchedule,
        canAskAgain: true,
        channelBlocked: false,
      },
    }),
    requestPermissionAfterExplanation: jest.fn().mockResolvedValue({
      ok: true,
      value: { status: "denied", canSchedule: false, canAskAgain: false, channelBlocked: false },
    }),
    openSettings: jest.fn().mockResolvedValue({ ok: true, value: undefined }),
    list: jest.fn().mockResolvedValue({ ok: true, value: [] }),
    cancel: jest.fn().mockResolvedValue({ ok: true, value: undefined }),
    schedule: jest
      .fn()
      .mockImplementation(async (request) => ({ ok: true, value: request.plan.key })),
  };
  const schedule = new ReminderSchedule(
    clock,
    {
      get: async () => repositorySuccess(vehicle),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    repository,
    notifications,
    () => ({ title: "Reminder", body: "Date" }),
  );
  const service = new ReminderService(
    clock,
    identity,
    scheduleAwareReminderRepository(repository, schedule),
  );
  const onBack = jest.fn();
  await render(
    <RemindersSection
      embedded={embedded}
      vehicle={vehicle}
      clock={clock}
      reminders={service}
      reminderNotifications={notifications}
      reminderSchedule={schedule}
      onBack={onBack}
    />,
  );
  await screen.findByRole("button", { name: "Add deadline: Technical inspection" });
  return { repository, notifications, schedule, onBack, stored: () => stored };
}

beforeEach(async () => {
  jest.replaceProperty(Platform, "OS", "ios");
  await appI18n.changeLanguage("en");
});
afterEach(async () => {
  await appI18n.changeLanguage("en");
});

async function chooseDate(platform: "ios" | "android" = "ios") {
  await userEvent.press(screen.getByRole("button", { name: "Insurance valid until" }));
  await userEvent.press(screen.getByRole("button", { name: "Pick date (date, UTC)" }));
  if (platform === "ios")
    await userEvent.press(screen.getByRole("button", { name: "Confirm date" }));
}

it("offers exactly two empty deadline cards without requesting permissions", async () => {
  const { notifications } = await setup();
  expect(screen.getByRole("button", { name: "Add deadline: Insurance" })).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: "Allow notifications" })).not.toBeOnTheScreen();
  expect(notifications.requestPermissionAfterExplanation).not.toHaveBeenCalled();
});

it.each(["ios", "android"] as const)(
  "saves a date-only deadline on %s and offers optional education after saving",
  async (platform) => {
    const { repository, notifications, stored } = await setup();
    jest.replaceProperty(Platform, "OS", platform);
    await userEvent.press(screen.getByRole("button", { name: "Add deadline: Insurance" }));
    expect(screen.getAllByRole("checkbox", { checked: true })).toHaveLength(3);
    await chooseDate(platform);
    await userEvent.press(screen.getByRole("button", { name: "Save deadline" }));
    expect(
      await screen.findByRole("button", { name: "Edit deadline: Insurance" }),
    ).toBeOnTheScreen();
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        dueDate: "2026-12-01",
        notificationDaysBefore: [7, 1, 0],
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    );
    expect(notifications.requestPermissionAfterExplanation).not.toHaveBeenCalled();
    expect(await screen.findByRole("button", { name: "Allow notifications" })).toBeOnTheScreen();
    await userEvent.press(screen.getByRole("button", { name: "Allow notifications" }));
    expect(notifications.requestPermissionAfterExplanation).toHaveBeenCalledTimes(1);
    expect(stored()).toHaveLength(1);
  },
);

it("requires a date and preserves drafts after picker dismissal and save failure", async () => {
  const { repository } = await setup();
  await userEvent.press(screen.getByRole("button", { name: "Add deadline: Insurance" }));
  await userEvent.press(screen.getByRole("button", { name: "Save deadline" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Choose a valid date.");
  expect(repository.create).not.toHaveBeenCalled();
  await userEvent.press(screen.getByRole("button", { name: "Insurance valid until" }));
  await userEvent.press(screen.getByRole("button", { name: "Dismiss native picker" }));
  expect(screen.getByText("Choose date")).toBeOnTheScreen();
  await chooseDate();
  repository.create.mockResolvedValueOnce(repositoryFailure("unavailable", "create"));
  await userEvent.press(screen.getByRole("button", { name: "Save deadline" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(/Could not save the deadline/);
  expect(screen.getByText("Dec 1, 2026")).toBeOnTheScreen();
});

it("preserves the original zone during editing and permits disabling every offset", async () => {
  const { repository, notifications } = await setup([fixture("2026-10-01", "Pacific/Auckland")]);
  await userEvent.press(screen.getByRole("button", { name: "Edit deadline: Insurance" }));
  await chooseDate();
  for (const name of ["7 days before", "1 day before", "On the due date"])
    await userEvent.press(screen.getByRole("checkbox", { name }));
  await userEvent.press(screen.getByRole("button", { name: "Save deadline" }));
  await screen.findByRole("button", { name: "Edit deadline: Insurance" });
  expect(repository.update).toHaveBeenCalledWith(
    expect.objectContaining({
      timeZone: "Pacific/Auckland",
      dueDate: "2026-12-01",
      notificationDaysBefore: [],
    }),
  );
  expect(screen.queryByRole("button", { name: "Allow notifications" })).not.toBeOnTheScreen();
  expect(notifications.requestPermissionAfterExplanation).not.toHaveBeenCalled();
});

it("requires confirmation before deletion and keeps the form on storage failure", async () => {
  const { repository } = await setup([fixture()]);
  const alert = jest.spyOn(Alert, "alert");
  await userEvent.press(screen.getByRole("button", { name: "Edit deadline: Insurance" }));
  await userEvent.press(screen.getByRole("button", { name: "Delete deadline" }));
  expect(repository.delete).not.toHaveBeenCalled();
  repository.delete.mockResolvedValueOnce(repositoryFailure("unavailable", "delete"));
  await act(() => {
    alert.mock.calls
      .at(-1)?.[2]
      ?.find((button) => button.style === "destructive")
      ?.onPress?.();
  });
  expect(await screen.findByRole("alert")).toHaveTextContent(/Could not delete the deadline/);
  await userEvent.press(screen.getByRole("button", { name: "Delete deadline" }));
  await act(() => {
    alert.mock.calls
      .at(-1)?.[2]
      ?.find((button) => button.style === "destructive")
      ?.onPress?.();
  });
  expect(await screen.findByRole("button", { name: "Add deadline: Insurance" })).toBeOnTheScreen();
});

it("requires confirmation for a dirty draft and returns directly for an unchanged form", async () => {
  await setup();
  const alert = jest.spyOn(Alert, "alert");
  await userEvent.press(screen.getByRole("button", { name: "Add deadline: Insurance" }));
  await userEvent.press(screen.getByRole("button", { name: "Cancel" }));
  expect(alert).not.toHaveBeenCalled();
  await userEvent.press(screen.getByRole("button", { name: "Add deadline: Insurance" }));
  await userEvent.press(screen.getByRole("checkbox", { name: "7 days before" }));
  await userEvent.press(screen.getByRole("button", { name: "Cancel" }));
  expect(alert).toHaveBeenCalledWith("Discard changes?", expect.any(String), expect.any(Array));
  expect(screen.getByRole("button", { name: "Save deadline" })).toBeOnTheScreen();
});

it.each([
  ["2026-09-03", "Overdue"],
  ["2026-09-04", "Today"],
  ["2026-09-05", "Upcoming"],
])("shows the deadline status for %s without hiding past dates", async (date, status) => {
  await setup([fixture(date)]);
  expect(screen.getByText(status)).toBeOnTheScreen();
});

it("reports scheduling failure without hiding saved deadlines and retries", async () => {
  const { notifications, schedule } = await setup([fixture()], true);
  notifications.list.mockResolvedValueOnce({
    ok: false,
    error: { kind: "unavailable", operation: "list" },
  });
  await act(async () => {
    await schedule.reconcile();
  });
  expect(screen.getByRole("alert")).toHaveTextContent(/Your deadlines are safe/);
  expect(screen.getByRole("button", { name: "Edit deadline: Insurance" })).toBeOnTheScreen();
  await userEvent.press(screen.getByRole("button", { name: "Try again" }));
  await waitFor(() => expect(screen.queryByRole("alert")).not.toBeOnTheScreen());
});

it("reports permission inspection failure instead of an endless checking state", async () => {
  const { notifications, schedule } = await setup([fixture()]);
  notifications.getPermission.mockResolvedValue({
    ok: false,
    error: { kind: "unavailable", operation: "notifications.permission" },
  });
  await act(async () => {
    await schedule.reconcile();
  });
  expect(screen.getByText("Notification permissions could not be checked.")).toBeOnTheScreen();
  expect(screen.queryByText("Checking notification permissions…")).not.toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Edit deadline: Insurance" })).toBeOnTheScreen();
  expect(notifications.requestPermissionAfterExplanation).not.toHaveBeenCalled();
});

it("offers system settings after a permanent denial and reflects permission restoration", async () => {
  const { notifications, schedule } = await setup([fixture()]);
  notifications.getPermission.mockResolvedValue({
    ok: true,
    value: { status: "denied", canSchedule: false, canAskAgain: false, channelBlocked: false },
  });
  await act(async () => {
    await schedule.reconcile();
  });
  expect(screen.queryByRole("button", { name: "Allow notifications" })).not.toBeOnTheScreen();
  await userEvent.press(screen.getByRole("button", { name: "Open notification settings" }));
  expect(notifications.openSettings).toHaveBeenCalledTimes(1);
  notifications.getPermission.mockResolvedValue({
    ok: true,
    value: { status: "granted", canSchedule: true, canAskAgain: false, channelBlocked: false },
  });
  await act(async () => {
    await schedule.reconcile();
  });
  expect(screen.getByText("Notification permission is enabled.")).toBeOnTheScreen();
});

it("renders Polish labels when the selected language changes", async () => {
  await setup([fixture()]);
  await act(async () => {
    await appI18n.changeLanguage("pl");
  });
  expect(screen.getByRole("header", { name: "Przypomnienia" })).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Edytuj termin: Ubezpieczenie" })).toBeOnTheScreen();
});
