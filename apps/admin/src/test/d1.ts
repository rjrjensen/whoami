// Tests only: a D1Database over Node's built-in SQLite, with fit-check's real migrations applied.
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";

const MIGRATIONS = new URL("../../../fit-check/migrations/", import.meta.url);

class Statement {
  constructor(
    private sqlite: DatabaseSync,
    readonly sql: string,
    readonly params: SQLInputValue[] = [],
  ) {}
  bind(...params: unknown[]) {
    return new Statement(this.sqlite, this.sql, params as SQLInputValue[]);
  }
  async first<T>(column?: string): Promise<T | null> {
    const row = this.sqlite.prepare(this.sql).get(...this.params) as Record<string, unknown> | undefined;
    if (!row) return null;
    return (column ? row[column] : { ...row }) as T;
  }
  async all<T>() {
    return { results: this.sqlite.prepare(this.sql).all(...this.params).map((r) => ({ ...r })) as T[], success: true, meta: {} };
  }
  async run() {
    const { changes } = this.sqlite.prepare(this.sql).run(...this.params);
    return { results: [], success: true, meta: { changes: Number(changes) } };
  }
}

export function testDb(): D1Database {
  const sqlite = new DatabaseSync(":memory:");
  for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort()) sqlite.exec(readFileSync(new URL(file, MIGRATIONS), "utf8"));
  const db = {
    prepare: (sql: string) => new Statement(sqlite, sql),
    async batch(stmts: Statement[]) {
      sqlite.exec("BEGIN");
      try {
        const out = [];
        for (const s of stmts) out.push(/^\s*(SELECT|WITH)/i.test(s.sql) ? await s.all() : await s.run());
        sqlite.exec("COMMIT");
        return out;
      } catch (err) {
        sqlite.exec("ROLLBACK");
        throw err;
      }
    },
    async exec(sql: string) {
      sqlite.exec(sql);
      return { count: 0, duration: 0 };
    },
  };
  return db as unknown as D1Database;
}
