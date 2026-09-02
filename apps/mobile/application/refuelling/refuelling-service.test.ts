import type { RefuellingRepository } from "@/application/repositories/refuelling-repository";
import { repositoryFailure, repositorySuccess } from "@/application/repositories/repository-result";
import { createRefuelling, type Refuelling } from "@/domain/refuelling/refuelling";
import { vehicleIdFromUuidV7 } from "@/domain/shared/identifiers";

import { RefuellingService } from "./refuelling-service";

const vehicleId = vehicleIdFromUuidV7("018f47e2-7b2f-7cc8-98c4-dc0c0c07398f");
const refuellingId = "018f47e2-7b35-7658-b336-34613389d00f";
const createdAt = new Date("2026-08-30T18:30:00.000Z");
const updatedAt = new Date("2026-09-01T10:00:00.000Z");

describe("RefuellingService", () => {
  it("validates and creates a refuelling before returning the saved record", async () => {
    const repository = repositoryFake();
    const service = serviceWith(repository);

    const result = await service.create(refuellingInput());

    expect(result).toMatchObject({
      ok: true,
      value: {
        fillKind: "full",
        id: refuellingId,
        quantityMicrolitres: 45_000_000,
        vehicleId,
      },
    });
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ id: refuellingId, vehicleId }),
    );
  });

  it("rejects invalid input without writing to the repository", async () => {
    const repository = repositoryFake();
    const service = serviceWith(repository);

    const result = await service.create({ ...refuellingInput(), quantityMicrolitres: 0 });

    expect(result).toMatchObject({
      error: {
        kind: "unsupported",
        operation: "refuelling.create",
      },
      ok: false,
    });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("updates an existing refuelling while preserving its identity and creation time", async () => {
    const repository = repositoryFake();
    const existing = refuellingFixture();
    const service = serviceWith(repository, updatedAt);

    const result = await service.update(existing, {
      ...refuellingInput(),
      fillKind: "partial",
      quantityMicrolitres: 20_000_000,
    });

    expect(result).toMatchObject({
      ok: true,
      value: {
        createdAt: existing.createdAt,
        fillKind: "partial",
        id: existing.id,
        quantityMicrolitres: 20_000_000,
        updatedAt: updatedAt.toISOString(),
      },
    });
    expect(repository.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: existing.id, updatedAt: updatedAt.toISOString() }),
    );
  });

  it("returns repository failures without replacing their operation", async () => {
    const failure = repositoryFailure("unavailable", "refuelling.create");
    const repository = repositoryFake();
    repository.create.mockResolvedValue(failure);
    const service = serviceWith(repository);

    const result = await service.create(refuellingInput());

    expect(result).toBe(failure);
  });

  it("loads records together with an auditable consumption summary", async () => {
    const first = refuellingFixture();
    const second = {
      ...refuellingFixture(),
      createdAt: "2026-09-01T08:00:00.000Z" as Refuelling["createdAt"],
      id: "018f47e2-7b36-7658-b336-34613389d00f" as Refuelling["id"],
      occurredAt: "2026-09-01T08:00:00.000Z" as Refuelling["occurredAt"],
      odometerMetres: 99_600_000 as Refuelling["odometerMetres"],
      quantityMicrolitres: 45_000_000 as Refuelling["quantityMicrolitres"],
      updatedAt: "2026-09-01T08:00:00.000Z" as Refuelling["updatedAt"],
    };
    const repository = repositoryFake([second, first]);
    const service = serviceWith(repository);

    const result = await service.list(vehicleId);

    expect(result).toMatchObject({
      ok: true,
      value: {
        consumption: {
          includedRefuellingIds: [first.id, second.id],
          totalDistanceMetres: 600_000,
          totalFuelMicrolitres: 45_000_000,
        },
        refuellings: [second, first],
      },
    });
    expect(repository.list).toHaveBeenCalledWith(vehicleId);
  });

  it("delegates get and delete with the vehicle boundary", async () => {
    const repository = repositoryFake();
    const existing = refuellingFixture();
    repository.get.mockResolvedValue(repositorySuccess(existing));
    const service = serviceWith(repository);

    await expect(service.get(vehicleId, existing.id)).resolves.toEqual(repositorySuccess(existing));
    await expect(service.delete(vehicleId, existing.id)).resolves.toEqual(
      repositorySuccess(undefined),
    );
    expect(repository.get).toHaveBeenCalledWith(vehicleId, existing.id);
    expect(repository.delete).toHaveBeenCalledWith(vehicleId, existing.id);
  });
});

function serviceWith(repository: ReturnType<typeof repositoryFake>, now = createdAt) {
  return new RefuellingService({ now: () => now }, { generate: () => refuellingId }, repository);
}

function repositoryFake(refuellings: readonly Refuelling[] = []) {
  return {
    create: jest.fn().mockResolvedValue(repositorySuccess(undefined)),
    delete: jest.fn().mockResolvedValue(repositorySuccess(undefined)),
    get: jest.fn().mockResolvedValue(repositorySuccess(null)),
    list: jest.fn().mockResolvedValue(repositorySuccess(refuellings)),
    update: jest.fn().mockResolvedValue(repositorySuccess(undefined)),
  } satisfies RefuellingRepository;
}

function refuellingInput() {
  return {
    fillKind: "full",
    inputVolumeUnit: "litres",
    occurredAt: "2026-08-30T17:00:00.000Z",
    odometerMetres: 99_000_000,
    pricing: {
      inputMode: "total",
      totalCost: { currency: "PLN", minorUnits: 30_000 },
      unitPriceMilliUnits: 6_667,
      unitPriceVolumeUnit: "litres",
    },
    quantityMicrolitres: 45_000_000,
    vehicleId,
  } as const;
}

function refuellingFixture(): Refuelling {
  const result = createRefuelling(refuellingInput(), {
    clock: { now: () => createdAt },
    idGenerator: { generate: () => refuellingId },
  });
  if (!result.ok) throw new Error("Expected a valid refuelling fixture");
  return result.value;
}
