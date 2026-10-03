export function mergeUtcDateTime(current: Date, selected: Date, mode: "date" | "time") {
  return mode === "date"
    ? new Date(
        Date.UTC(
          selected.getUTCFullYear(),
          selected.getUTCMonth(),
          selected.getUTCDate(),
          current.getUTCHours(),
          current.getUTCMinutes(),
        ),
      )
    : new Date(
        Date.UTC(
          current.getUTCFullYear(),
          current.getUTCMonth(),
          current.getUTCDate(),
          selected.getUTCHours(),
          selected.getUTCMinutes(),
        ),
      );
}
