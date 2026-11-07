export function mergeUtcDateTime(current: Date, selected: Date, mode: "date" | "time") {
  const date = mode === "date" ? selected : current;
  const time = mode === "time" ? selected : current;
  const result = new Date(0);
  result.setUTCFullYear(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  result.setUTCHours(time.getUTCHours(), time.getUTCMinutes(), 0, 0);
  return result;
}
