const mockGetRandomValues = jest.fn((value: Uint8Array) => value.fill(42));
const generatedId = "01941f29-7c00-73e4-a310-744d2167fc5b";
const mockUuidV7 = jest.fn(({ rng }: { rng: () => Uint8Array }) => {
  expect(rng()).toEqual(new Uint8Array(16).fill(42));
  return generatedId;
});

jest.mock("expo-crypto", () => ({
  getRandomValues: (value: Uint8Array) => mockGetRandomValues(value),
}));

jest.mock("uuid", () => ({
  v7: (options: { rng: () => Uint8Array }) => mockUuidV7(options),
}));

import { UuidV7IdGenerator } from "./uuid-v7-id-generator";

describe("UuidV7IdGenerator", () => {
  it("provides native secure random bytes to the UUIDv7 implementation", () => {
    const value = new UuidV7IdGenerator().generate();

    expect(value).toBe(generatedId);
    expect(mockUuidV7).toHaveBeenCalledTimes(1);
    expect(mockGetRandomValues).toHaveBeenCalledTimes(1);
    expect(mockGetRandomValues.mock.calls[0]?.[0]).toHaveLength(16);
  });
});
