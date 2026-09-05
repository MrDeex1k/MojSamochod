import { EraseAllData, type EraseDataStorage } from "./erase-all-data";

it.each(["clearDatabase", "clearFiles", "finish"] as const)(
  "resumes an erase interrupted at %s with a new coordinator",
  async (stage) => {
    let marker = false;
    const storage: EraseDataStorage = {
      begin: jest.fn(async () => {
        marker = true;
      }),
      isPending: async () => marker,
      clearDatabase: jest.fn(async () => undefined),
      clearFiles: jest.fn(async () => undefined),
      finish: jest.fn(async () => {
        marker = false;
      }),
    };
    const original = storage[stage];
    storage[stage] = jest
      .fn()
      .mockRejectedValueOnce(new Error("Interrupted"))
      .mockImplementation(original);
    const cancel = jest.fn(async () => ({ ok: true }));
    expect(await new EraseAllData(storage, cancel).erase()).toMatchObject({ ok: false });
    expect(marker).toBe(true);
    expect(await new EraseAllData(storage, cancel).resume()).toMatchObject({ ok: true });
    expect(marker).toBe(false);
    expect(storage.clearDatabase).toHaveBeenCalledTimes(2);
  },
);

it("retains the marker until owned notifications are cancelled", async () => {
  let marker = false;
  const storage = {
    begin: async () => {
      marker = true;
    },
    isPending: async () => marker,
    clearDatabase: jest.fn(async () => undefined),
    clearFiles: jest.fn(async () => undefined),
    finish: jest.fn(async () => {
      marker = false;
    }),
  };
  const cancel = jest.fn().mockResolvedValueOnce({ ok: false }).mockResolvedValue({ ok: true });
  const erase = new EraseAllData(storage, cancel);
  expect(await erase.erase()).toMatchObject({ ok: false });
  expect(storage.finish).not.toHaveBeenCalled();
  expect(marker).toBe(true);
  expect(await new EraseAllData(storage, cancel).resume()).toMatchObject({ ok: true });
  expect(marker).toBe(false);
});

it("does not erase an ordinary startup and coalesces duplicate requests", async () => {
  const storage = {
    begin: jest.fn(async () => undefined),
    isPending: async () => false,
    clearDatabase: jest.fn(async () => undefined),
    clearFiles: jest.fn(async () => undefined),
    finish: jest.fn(async () => undefined),
  };
  const erase = new EraseAllData(storage, async () => ({ ok: true }));
  await erase.resume();
  expect(storage.clearDatabase).not.toHaveBeenCalled();
  await Promise.all([erase.erase(), erase.erase()]);
  expect(storage.begin).toHaveBeenCalledTimes(1);
});
