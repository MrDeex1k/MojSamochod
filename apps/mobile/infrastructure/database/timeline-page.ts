import { and, eq, gt, lt, type SQL } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";
import type { HistoryCursor } from "@/application/repositories/history-entry-repository";

/** Each range starts with exact index keys and seeks directly to the next eligible row. */
export function readTimelinePage<Row>(
  columns: { occurredAt: SQLiteColumn; createdAt: SQLiteColumn; id: SQLiteColumn },
  cursor: HistoryCursor | undefined,
  limit: number,
  read: (range: SQL | undefined, limit: number) => Row[],
): Row[] {
  if (!cursor) return read(undefined, limit);
  const { occurredAt, createdAt, id } = columns;
  const ranges = [
    and(eq(occurredAt, cursor.occurredAt), eq(createdAt, cursor.createdAt), gt(id, cursor.id)),
    and(eq(occurredAt, cursor.occurredAt), lt(createdAt, cursor.createdAt)),
    lt(occurredAt, cursor.occurredAt),
  ];
  const rows: Row[] = [];
  for (const range of ranges) {
    rows.push(...read(range, limit - rows.length));
    if (rows.length === limit) break;
  }
  return rows;
}
