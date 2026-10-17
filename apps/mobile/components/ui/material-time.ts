// Compose time pickers use device-local hours; the application stores entry times in UTC.
export function utcClockForDevice(value: Date): Date {
  return new Date(2000, 0, 15, value.getUTCHours(), value.getUTCMinutes(), 0, 0);
}

export function deviceClockToUtc(original: Date, selected: Date): Date {
  const result = new Date(original);
  result.setUTCHours(selected.getHours(), selected.getMinutes(), 0, 0);
  return result;
}
