import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Static RLS guard — runs in CI with NO database. It parses the init migration and asserts that
 * every table created in `public` has RLS both ENABLED and FORCED, and has at least one policy.
 * This catches the classic "forgot RLS on a new table" leak (AGENTS.md §1.5).
 *
 * The runtime cross-patient DENIAL test lives in supabase/tests/rls_policies.test.sql (pgTAP) and
 * runs against a live database in a later integration window — it needs a Postgres instance.
 */
const rawSql = readFileSync(
  new URL("../../../supabase/migrations/0001_init.sql", import.meta.url),
  "utf8",
);
// Collapse runs of spaces/tabs so column-aligned statements still match exactly.
const sql = rawSql.replace(/[ \t]+/g, " ");

function tablesCreated(source: string): string[] {
  const re = /create table public\.(\w+)/g;
  const names: string[] = [];
  for (const m of source.matchAll(re)) names.push(m[1]!);
  return names;
}

describe("RLS is enabled on every table", () => {
  const tables = tablesCreated(sql);

  it("migration creates the expected tables", () => {
    expect(tables.sort()).toEqual(
      ["claim_groups", "claims", "confirmations", "documents", "members", "patients", "recordings"].sort(),
    );
  });

  it.each(tablesCreated(sql))("table %s has RLS enabled, forced, and a policy", (table) => {
    expect(sql).toContain(`alter table public.${table} enable row level security`);
    expect(sql).toContain(`alter table public.${table} force row level security`);
    expect(sql).toMatch(new RegExp(`create policy \\w+ on public\\.${table}\\b`));
  });
});
