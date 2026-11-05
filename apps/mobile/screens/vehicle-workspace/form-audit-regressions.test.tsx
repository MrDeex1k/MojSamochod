import { act, renderHook } from "@testing-library/react-native";
import { createDevelopmentVehicleHistoryFixture } from "@/development/fixtures/vehicle-history";
import { repositorySuccess } from "@/application/repositories/repository-result";
import type { HistoryEntryRepository } from "@/application/repositories/history-entry-repository";
import type { VehicleRepository } from "@/application/repositories/vehicle-repository";
import type { ManagedFileCoordinator } from "@/application/storage/managed-file-coordinator";
import type { RefuellingService } from "@/application/refuelling/refuelling-service";
import type { VehicleDocumentService } from "@/application/documents/vehicle-document-service";
import type { ReminderNotifications } from "@/application/notifications/reminder-notifications";
import type { ReminderSchedule } from "@/application/notifications/reminder-schedule";
import { managedFileIdFromUuidV7 } from "@/domain/shared/identifiers";
import { createRefuelling } from "@/domain/refuelling/refuelling";
import { hasFuelConfiguration } from "@/domain/vehicle/vehicle";
import { utcTimestamp } from "@/domain/shared/value-objects";
import { useEntryForm } from "./use-entry-form";
import { useVehicleEditForm } from "./use-vehicle-edit-form";
import { useRefuellingForm } from "./use-refuelling-form";
import { useDocumentForm } from "./use-document-form";
import { useNotificationActions } from "./use-notification-actions";

jest.mock("@/components/layout/navigation-guard", () => ({
  useFormExitGuard: (_draft: unknown, _busy: boolean, cancel: () => void) => cancel,
}));

const fixture = createDevelopmentVehicleHistoryFixture();
const vehicle = fixture.vehicle;
const clock = { now: () => new Date("2026-11-05T10:00:00.000Z") };
const idGenerator = { generate: () => "01990000-0001-7000-8000-000000000001" };
const oldPhoto = managedFileIdFromUuidV7("01990000-0001-7000-8000-000000000002");

it("keeps a committed new vehicle photo when old-photo cleanup throws", async () => {
  const remove = jest.fn().mockRejectedValue(new Error("cleanup I/O failure"));
  const onSaved = jest.fn();
  const update = jest.fn().mockResolvedValue(repositorySuccess(undefined));
  const { result } = await renderHook(() =>
    useVehicleEditForm({
      clock,
      idGenerator,
      vehicle: { ...vehicle, photoReference: oldPhoto },
      existingPhotoUri: "file:///old.jpg",
      onCancel: jest.fn(),
      onSaved,
      vehicles: { update } as unknown as VehicleRepository,
      managedFiles: {
        import: jest.fn().mockResolvedValue(repositorySuccess({})),
        remove,
      } as unknown as ManagedFileCoordinator,
      photoPicker: {
        select: async () => ({
          kind: "selected",
          uri: "file:///new.jpg",
          mimeType: "image/jpeg",
          originalName: "new.jpg",
        }),
      },
    }),
  );
  await act(() => result.current.selectPhoto());
  await act(() => result.current.save());
  expect(update).toHaveBeenCalledTimes(1);
  expect(remove).toHaveBeenCalledTimes(1);
  expect(remove).toHaveBeenCalledWith(oldPhoto);
  expect(onSaved).toHaveBeenCalledTimes(1);
  expect(result.current.formError).toBeNull();
});

it("shows a retryable vehicle error when both save and rollback throw", async () => {
  const onSaved = jest.fn();
  const { result } = await renderHook(() =>
    useVehicleEditForm({
      clock,
      idGenerator,
      vehicle,
      existingPhotoUri: null,
      onCancel: jest.fn(),
      onSaved,
      vehicles: {
        update: jest.fn().mockRejectedValue(new Error("database unavailable")),
      } as unknown as VehicleRepository,
      managedFiles: {
        import: jest.fn().mockResolvedValue(repositorySuccess({})),
        remove: jest.fn().mockRejectedValue(new Error("cleanup unavailable")),
      } as unknown as ManagedFileCoordinator,
      photoPicker: {
        select: async () => ({
          kind: "selected",
          uri: "file:///new.jpg",
          mimeType: "image/jpeg",
          originalName: "new.jpg",
        }),
      },
    }),
  );
  await act(() => result.current.selectPhoto());
  await act(() => result.current.save());
  expect(onSaved).not.toHaveBeenCalled();
  expect(result.current.formError).not.toBeNull();
  expect(result.current.saving).toBe(false);
});

it.each(["2026-08-01T10:15:42.123Z", "0099-08-01T10:15:42.123Z"])(
  "preserves untouched history timestamps %s and submits only once per pending save",
  async (timestamp) => {
    const parsed = utcTimestamp(timestamp, "occurredAt");
    if (!parsed.ok) throw new Error("Invalid test timestamp");
    const entry = { ...fixture.entries[0]!, occurredAt: parsed.value };
    const update = jest.fn().mockResolvedValue(repositorySuccess(undefined));
    const onSaved = jest.fn();
    const { result } = await renderHook(() =>
      useEntryForm({
        clock,
        idGenerator,
        vehicle,
        entry,
        type: entry.type,
        onCancel: jest.fn(),
        onSaved,
        historyEntries: { update } as unknown as HistoryEntryRepository,
      }),
    );
    const save = result.current.save;
    await act(async () => {
      await Promise.all([save(), save()]);
    });
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ occurredAt: timestamp }));
  },
);

it("preserves a refuelling timestamp, formats editable prices without grouping and prevents duplicate saves", async () => {
  if (!hasFuelConfiguration(vehicle)) throw new Error("Missing fuel configuration");
  const created = createRefuelling(
    {
      vehicleId: vehicle.id,
      fillKind: "full",
      inputVolumeUnit: "litres",
      quantityMicrolitres: 10_000_000,
      occurredAt: "0099-08-01T10:15:42.123Z",
      pricing: {
        inputMode: "perVolumeUnit",
        totalCost: { currency: "USD", minorUnits: 1_234_560 },
        unitPriceMilliUnits: 1_234_560,
        unitPriceVolumeUnit: "litres",
      },
    },
    { clock, idGenerator },
  );
  if (!created.ok) throw new Error("Invalid refuelling fixture");
  const update = jest.fn().mockResolvedValue(repositorySuccess(created.value));
  const { result } = await renderHook(() =>
    useRefuellingForm({
      clock,
      vehicle: { ...vehicle, fuelVolumeUnitPreference: "litres" },
      refuelling: created.value,
      onCancel: jest.fn(),
      onSaved: jest.fn(),
      refuellings: { update } as unknown as RefuellingService,
    }),
  );
  expect(result.current.price).toBe("1234.56");
  await act(() => result.current.changeCurrency("EUR"));
  const save = result.current.save;
  await act(async () => {
    await Promise.all([save(), save()]);
  });
  expect(update).toHaveBeenCalledTimes(1);
  expect(update).toHaveBeenCalledWith(
    created.value,
    expect.objectContaining({
      occurredAt: created.value.occurredAt,
      pricing: expect.objectContaining({ totalCost: { currency: "EUR", minorUnits: 1_234_560 } }),
    }),
  );
});

it("does not create two documents through the same render's save handler", async () => {
  const create = jest.fn().mockResolvedValue(repositorySuccess({}));
  const { result } = await renderHook(() =>
    useDocumentForm({
      vehicle,
      entries: [],
      onCancel: jest.fn(),
      onSaved: jest.fn(),
      documents: { create } as unknown as VehicleDocumentService,
      picker: {
        pick: async () => ({
          kind: "selected",
          document: {
            name: "invoice.pdf",
            uri: "file:///invoice.pdf",
            mimeType: "application/pdf",
          },
        }),
      },
    }),
  );
  await act(() => result.current.chooseFile());
  const save = result.current.save;
  await act(async () => {
    await Promise.all([save(), save()]);
  });
  expect(create).toHaveBeenCalledTimes(1);
});

it("reports failed notification retries and coalesces repeated button actions", async () => {
  const reconcile = jest.fn().mockResolvedValue({ ok: false });
  const { result } = await renderHook(() =>
    useNotificationActions(
      {} as ReminderNotifications,
      { reconcile } as unknown as ReminderSchedule,
    ),
  );
  const retry = result.current.retry;
  await act(async () => {
    await Promise.all([retry(), retry()]);
  });
  expect(reconcile).toHaveBeenCalledTimes(1);
  expect(result.current.error).toBe(true);
  expect(result.current.busy).toBe(false);
});
