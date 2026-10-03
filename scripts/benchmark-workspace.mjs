// Controlled host SQLite benchmark. This measures query transfer, not native FPS or TTI.
import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync } from "node:fs";
import { performance } from "node:perf_hooks";

const migrations = new URL("../apps/mobile/infrastructure/database/migrations/", import.meta.url);
const output = [];
for (const size of [100, 1000, 10000]) {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const name of readdirSync(migrations)
    .filter((name) => name.endsWith(".sql"))
    .sort())
    db.exec(readFileSync(new URL(name, migrations), "utf8"));
  const stamp = "2026-09-01T00:00:00.000Z";
  db.prepare(
    "INSERT INTO vehicles (id,make,model,distance_unit_preference,created_at,updated_at) VALUES ('vehicle','Test','Benchmark','kilometres',?,?)",
  ).run(stamp, stamp);
  const history = db.prepare(
    "INSERT INTO history_entries (id,vehicle_id,type,occurred_at,created_at,updated_at,notes) VALUES (?,'vehicle','repair',?,?,?,?)",
  );
  const details = db.prepare("INSERT INTO repair_details (history_entry_id,subject) VALUES (?,?)");
  const file = db.prepare(
    "INSERT INTO managed_files (id,kind,status,storage_key,mime_type,original_name,byte_size,sha256,created_at,updated_at) VALUES (?,'document','ready',?,'application/pdf','invoice.pdf',1,?,?,?)",
  );
  const document = db.prepare(
    "INSERT INTO vehicle_documents (id,vehicle_id,history_entry_id,file_reference,name,notes,created_at,updated_at) VALUES (?,'vehicle',?,?,'Invoice',?,?,?)",
  );
  const fuel = db.prepare(
    "INSERT INTO refuellings (id,vehicle_id,occurred_at,odometer_metres,quantity_microlitres,input_volume_unit,fill_kind,created_at,updated_at) VALUES (?,'vehicle',?,?,40000000,'litres','full',?,?)",
  );
  db.exec("BEGIN");
  for (let i = 0; i < size; i++) {
    const id = String(i).padStart(8, "0");
    history.run(id, stamp, stamp, stamp, "n".repeat(1000));
    details.run(id, `Service ${id}`);
    file.run(id, `objects/${id}`, i.toString(16).padStart(64, "0"), stamp, stamp);
    document.run(id, id, id, "n".repeat(1000), stamp, stamp);
    fuel.run(id, stamp, i * 500000, stamp, stamp);
  }
  db.exec("COMMIT");
  const ids = Array.from({ length: 50 }, (_, i) => String(i).padStart(8, "0"));
  const marks = ids.map(() => "?").join(",");
  const joins =
    "FROM history_entries h LEFT JOIN inspection_details i ON i.history_entry_id = h.id LEFT JOIN replacement_details p ON p.history_entry_id = h.id LEFT JOIN repair_details r ON r.history_entry_id = h.id";
  const reference =
    "h.id, h.type, h.occurred_at, h.created_at, coalesce(r.subject,p.item,i.description) AS subject, i.kind AS inspection_kind";
  const full =
    "h.*, i.kind, i.result, i.description AS inspection_description, p.item, p.manufacturer, p.part_number, r.subject, r.description AS repair_description";
  const order = "ORDER BY h.occurred_at DESC, h.created_at DESC, h.id ASC";
  const relationBatches = [];
  for (let start = 0; start < size; start += 900) {
    const batch = Array.from({ length: Math.min(900, size - start) }, (_, i) =>
      String(start + i).padStart(8, "0"),
    );
    relationBatches.push([
      `SELECT ${reference} ${joins} WHERE h.vehicle_id = ? AND h.id IN (${batch.map(() => "?").join(",")})`,
      ["vehicle", ...batch],
    ]);
  }
  const scenarios = [
    [
      "history.attachments.before",
      "SELECT * FROM vehicle_documents WHERE vehicle_id = ?",
      ["vehicle"],
    ],
    [
      "history.attachments.after",
      `SELECT history_entry_id, count(*) FROM vehicle_documents WHERE vehicle_id = ? AND history_entry_id IN (${marks}) GROUP BY history_entry_id`,
      ["vehicle", ...ids],
    ],
    [
      "documents.relations.before",
      `SELECT ${full} ${joins} WHERE h.vehicle_id = ? ${order}`,
      ["vehicle"],
    ],
    [
      "documents.selector.after",
      `SELECT ${reference} ${joins} WHERE h.vehicle_id = ? ${order} LIMIT 51`,
      ["vehicle"],
    ],
    ["documents.relations.after", null, null, relationBatches],
    [
      "fuel.before",
      "SELECT * FROM refuellings WHERE vehicle_id = ? ORDER BY occurred_at DESC, created_at DESC, id ASC",
      ["vehicle"],
    ],
    [
      "fuel.page.after",
      "SELECT * FROM refuellings WHERE vehicle_id = ? ORDER BY occurred_at DESC, created_at DESC, id ASC LIMIT 51",
      ["vehicle"],
    ],
    [
      "fuel.summary.after",
      "SELECT id, vehicle_id, occurred_at, created_at, fill_kind, quantity_microlitres, odometer_metres, input_volume_unit FROM refuellings WHERE vehicle_id = ?",
      ["vehicle"],
    ],
  ];
  for (const [name, sql, params, batches] of scenarios) {
    const queries = (batches ?? [[sql, params]]).map(([text, values]) => ({
      query: db.prepare(text),
      values,
    }));
    const read = () => queries.flatMap(({ query, values }) => query.all(...values));
    read();
    const times = [];
    let rows;
    for (let run = 0; run < 15; run++) {
      const start = performance.now();
      rows = read();
      times.push(performance.now() - start);
    }
    times.sort((a, b) => a - b);
    output.push({
      size,
      name,
      rows: rows.length,
      queries: queries.length,
      jsonBytes: Buffer.byteLength(JSON.stringify(rows)),
      medianMs: Number(times[7].toFixed(3)),
      p95Ms: Number(times[14].toFixed(3)),
    });
  }
  db.close();
}
console.log(
  JSON.stringify(
    {
      environment: `Node ${process.version}, host SQLite, warm cache, 15 repetitions`,
      results: output,
    },
    null,
    2,
  ),
);
