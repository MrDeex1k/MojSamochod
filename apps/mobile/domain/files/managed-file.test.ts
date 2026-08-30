import { byteSize, sha256Digest, storageObjectKey } from "./managed-file";

describe("managed file value objects", () => {
  it.each([0, 1, Number.MAX_SAFE_INTEGER])("accepts the byte size %s", (value) => {
    expect(byteSize(value)).toEqual({ ok: true, value });
  });

  it.each([-1, 1.5, Number.MAX_SAFE_INTEGER + 1])("rejects the byte size %s", (value) => {
    expect(byteSize(value)).toMatchObject({ ok: false });
  });

  it("accepts a canonical lowercase SHA-256 digest", () => {
    const digest = "a".repeat(64);

    expect(sha256Digest(digest)).toEqual({ ok: true, value: digest });
  });

  it.each(["A".repeat(64), "a".repeat(63), "not-a-digest"])(
    "rejects the SHA-256 digest %s",
    (value) => {
      expect(sha256Digest(value)).toMatchObject({ ok: false });
    },
  );

  it("accepts an opaque relative storage key", () => {
    const key = "objects/01/018f47e2-7b2f-7cc8-98c4-dc0c0c07398f.jpg";

    expect(storageObjectKey(key)).toEqual({ ok: true, value: key });
  });

  it.each([
    "",
    "/absolute/file.jpg",
    "objects/../file.jpg",
    "objects//file.jpg",
    "objects\\file.jpg",
    "objects/file name.jpg",
  ])("rejects an unsafe storage key %s", (value) => {
    expect(storageObjectKey(value)).toMatchObject({ ok: false });
  });
});
