import { createDevelopmentVehicleHistoryFixture } from "@/development/fixtures/vehicle-history";
import { createReminder } from "@/domain/reminders/reminder";
import { createAppI18n } from "./i18n";
import { reminderNotificationContent } from "./reminder-notification-content";

it.each([
  ["en", "insurance", "Insurance deadline", "Volvo V60 — valid until Dec 1, 2026."],
  ["pl", "technicalInspection", "Termin badania technicznego", "Volvo V60 — ważne do 1 gru 2026."],
  ["de", "insurance", "Insurance deadline", "Volvo V60 — valid until Dec 1, 2026."],
] as const)(
  "formats %s %s content with a calendar date and English fallback",
  (language, kind, title, body) => {
    const vehicle = createDevelopmentVehicleHistoryFixture().vehicle;
    const reminder = createReminder(
      { vehicleId: vehicle.id, kind, dueDate: "2026-12-01", timeZone: "Pacific/Auckland" },
      {
        clock: { now: () => new Date("2026-09-03T10:00:00.000Z") },
        idGenerator: { generate: () => "018f47e2-7b35-7658-b336-34613389d00f" },
      },
    );
    if (!reminder.ok) throw new Error("Invalid reminder fixture");
    expect(reminderNotificationContent(reminder.value, vehicle, createAppI18n(language))).toEqual({
      title,
      body,
    });
  },
);
