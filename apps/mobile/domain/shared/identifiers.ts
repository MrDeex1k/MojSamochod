declare const documentIdBrand: unique symbol;
declare const historyEntryIdBrand: unique symbol;
declare const managedFileIdBrand: unique symbol;
declare const vehicleIdBrand: unique symbol;

export type HistoryEntryId = string & { readonly [historyEntryIdBrand]: true };
export type ManagedFileId = string & { readonly [managedFileIdBrand]: true };
export type VehicleId = string & { readonly [vehicleIdBrand]: true };

const uuidV7Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function isUuidV7(value: string): boolean {
  return uuidV7Pattern.test(value);
}

function assertUuidV7(value: string): void {
  if (!isUuidV7(value)) {
    throw new Error("Expected a canonical lowercase UUIDv7 identifier");
  }
}

export function documentIdFromUuidV7(value: string): DocumentId {
  assertUuidV7(value);
  return value as DocumentId;
}

export function historyEntryIdFromUuidV7(value: string): HistoryEntryId {
  assertUuidV7(value);
  return value as HistoryEntryId;
}

export function managedFileIdFromUuidV7(value: string): ManagedFileId {
  assertUuidV7(value);
  return value as ManagedFileId;
}

export function vehicleIdFromUuidV7(value: string): VehicleId {
  assertUuidV7(value);
  return value as VehicleId;
}
export type DocumentId = string & { readonly [documentIdBrand]: true };
