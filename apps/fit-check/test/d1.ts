// A small in-memory stand-in for D1 (node:sqlite), so tests run the real SQL in src/db.ts against the real migrations.
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

export function memoryD1(...migrations: string[]) {
  const sqlite = new DatabaseSync(":memory:");
  for (const file of migrations) sqlite.exec(readFileSync(`${import.meta.dirname}/../migrations/${file}`, "utf8"));
  const db = {
    prepare(sql: string) {
      let args: (string | number | null)[] = [];
      const stmt = {
        bind(...values: (string | number | null)[]) {
          args = values;
          return stmt;
        },
        async run() {
          const { changes } = sqlite.prepare(sql).run(...args);
          return { success: true, results: [], meta: { changes: Number(changes) } };
        },
        async first<T>() {
          return (sqlite.prepare(sql).get(...args) as T | undefined) ?? null;
        },
        async all<T>() {
          return { success: true, results: sqlite.prepare(sql).all(...args) as T[], meta: {} };
        },
      };
      return stmt;
    },
  };
  return { db: db as unknown as D1Database, sqlite };
}
