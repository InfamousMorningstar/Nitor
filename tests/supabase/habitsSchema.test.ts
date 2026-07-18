import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * The tenancy invariant lives in DDL, and DDL is not exercised by any other
 * test — scripts/verify-rls.ts proves it, but only against a live project with
 * credentials. These assertions pin the shape offline so a regression is caught
 * on an ordinary `npm test` rather than at deploy time.
 *
 * They deliberately assert the RELATIONSHIP, not the whole file: that logs are
 * keyed and referenced by (user_id, ...), and that the single-column form the
 * cross-tenant finding was about does not come back.
 */
const sql = readFileSync(
  resolve(__dirname, "../../supabase/habits.sql"),
  "utf8",
);

const repository = readFileSync(
  resolve(__dirname, "../../src/data/SupabaseHabitRepository.ts"),
  "utf8",
);

/** Collapse whitespace so assertions survive reformatting/line wrapping. */
const flat = sql.replace(/\s+/g, " ");

/** The body of `create table if not exists public.logs ( ... );`. */
const logsTable = flat.match(/create table if not exists public\.logs \((.*?)\);/i)?.[1];

describe("supabase/habits.sql — log ownership is structural", () => {
  it("has a logs table definition to assert against", () => {
    // Guards every `logsTable` assertion below from silently passing as
    // `undefined` if the file is restructured.
    expect(logsTable).toBeDefined();
  });

  it("references habits by the tenant-qualified (user_id, id) key in the table definition", () => {
    // Asserted on the table body specifically, not the whole file: the
    // migration ALTER further down declares the same relationship, and a
    // check against the file as a whole passes even when the fresh-install
    // definition has been reverted to the single-column form.
    expect(logsTable).toMatch(
      /foreign key \(user_id, habit_id\) references public\.habits \(user_id, id\) on delete cascade/i,
    );
  });

  it("references habits by (user_id, id) in the migration path too", () => {
    expect(flat).toMatch(
      /alter table public\.logs add constraint \w+ foreign key \(user_id, habit_id\) references public\.habits \(user_id, id\) on delete cascade/i,
    );
  });

  it("declares the habits unique key that composite FK points at", () => {
    expect(flat).toMatch(
      /alter table public\.habits add constraint \w+ unique \(user_id, id\)/i,
    );
  });

  it("keys logs by (user_id, id) so an id is only claimable within a tenant", () => {
    // Both the fresh-install table definition and the migration path.
    expect(flat).toMatch(/constraint logs_pkey primary key \(user_id, id\)/i);
    expect(flat).toMatch(
      /alter table public\.logs add constraint logs_pkey primary key \(user_id, id\)/i,
    );
  });

  it("no longer declares a globally primary logs.id", () => {
    // `id text primary key` on logs is exactly the preemption hole: another
    // tenant could claim `${habitId}_${date}` and break the owner's write.
    expect(logsTable).not.toMatch(/id text primary key/i);
    expect(logsTable).toMatch(/id text not null/i);
  });

  it("never references habits(id) alone, in any syntactic form", () => {
    // The single-column form is validated with RLS bypassed against every
    // tenant's habits, which is what made the cross-tenant insert possible.
    // Matched file-wide and independent of whether the constraint is inline,
    // named, or in an ALTER — every route back to the bug is one assertion.
    expect(flat).not.toMatch(/references public\.habits \(id\)/i);
  });

  it("drops the legacy single-column FK so an existing project converges", () => {
    expect(flat).toMatch(
      /alter table public\.logs drop constraint if exists logs_habit_id_fkey/i,
    );
  });

  it("never unconditionally drops the habits unique key the logs FK depends on", () => {
    // Regression: `drop constraint if exists habits_user_id_id_key` followed by
    // an add works on a fresh database and ABORTS THE WHOLE FILE on the second
    // run — Postgres refuses to drop a unique constraint a live foreign key
    // references. Everything after it, including all the RLS policies, would
    // then never be applied.
    expect(flat).not.toMatch(
      /drop constraint if exists habits_user_id_id_key/i,
    );
  });

  it("guards the habits unique key on catalog state so a re-run is a no-op", () => {
    expect(flat).toMatch(/if not exists \(\s*select 1 from pg_constraint/i);
    expect(flat).toMatch(/conname = 'habits_user_id_id_key'/i);
  });

  it("adds the composite FK only when absent, rather than dropping a live one", () => {
    expect(flat).toMatch(/conname = 'logs_user_id_habit_id_fkey'/i);
  });

  // A pre-fix database where the vulnerability was actually EXERCISED holds
  // rows the composite FK forbids. Adding the constraint as immediately valid
  // aborts there, so the migration would converge only from a database that
  // never had the bug. These pin the NOT VALID -> clean -> VALIDATE sequence.
  describe("legacy ghost-row policy", () => {
    it("adds the composite FK as NOT VALID so legacy rows cannot abort the file", () => {
      expect(flat).toMatch(
        /add constraint logs_user_id_habit_id_fkey foreign key \(user_id, habit_id\) references public\.habits \(user_id, id\) on delete cascade not valid/i,
      );
    });

    it("deletes logs whose (user_id, habit_id) matches no habit", () => {
      expect(flat).toMatch(
        /delete from public\.logs l where not exists \(\s*select 1 from public\.habits h where h\.user_id = l\.user_id and h\.id = l\.habit_id\s*\)/i,
      );
    });

    it("validates the FK afterwards, so it never stays permanently NOT VALID", () => {
      expect(flat).toMatch(
        /alter table public\.logs validate constraint logs_user_id_habit_id_fkey/i,
      );
    });

    it("cleans before validating — the reverse order would abort", () => {
      const cleanup = flat.search(/delete from public\.logs l where not exists/i);
      const validate = flat.search(/validate constraint logs_user_id_habit_id_fkey/i);
      expect(cleanup).toBeGreaterThan(-1);
      expect(validate).toBeGreaterThan(cleanup);
    });

    it("documents why deletion is the chosen policy", () => {
      // A destructive migration step should never be silent about its reasoning.
      expect(flat).toMatch(/POLICY FOR LEGACY GHOST LOGS/i);
    });
  });

  describe("habit identity is tenant-qualified", () => {
    it("keys habits by (user_id, id), not by a globally claimable id", () => {
      expect(flat).toMatch(/constraint habits_pkey primary key \(user_id, id\)/i);
      expect(flat).toMatch(
        /alter table public\.habits add constraint habits_pkey primary key \(user_id, id\)/i,
      );
    });

    it("no longer declares a globally primary habits.id", () => {
      const habitsTable = flat.match(
        /create table if not exists public\.habits \((.*?)\);/i,
      )?.[1];
      expect(habitsTable).toBeDefined();
      expect(habitsTable).not.toMatch(/id text primary key/i);
      expect(habitsTable).toMatch(/id text not null/i);
    });

    it("reads primary-key shape in conkey ordinal order, not alphabetically", () => {
      // An alphabetical aggregate reports (id, user_id) and (user_id, id)
      // identically, so it would certify a key whose leading column is `id` —
      // useless to every RLS policy, all of which filter on user_id first.
      expect(flat).not.toMatch(/string_agg\(a\.attname, ',' order by a\.attname\)/i);
      const ordinal = flat.match(/order by k\.ord/gi) ?? [];
      expect(ordinal).toHaveLength(2); // habits and logs guards both fixed
      expect(flat).toMatch(/unnest\(c\.conkey\) with ordinality as k\(attnum, ord\)/i);
    });
  });

  it("keeps the (user_id, habit_id, date) upsert arbiter logValue declares", () => {
    // SupabaseHabitRepository.logValue upserts on this exact conflict target.
    expect(flat).toMatch(
      /constraint logs_user_habit_date_key unique \(user_id, habit_id, date\)/i,
    );
  });

  // The schema and the repository are edited in different files, in different
  // languages, and every other test here pins only one side. Nothing pinned
  // that they AGREE — and a disagreement is not a lint error, it is a runtime
  // 42P10 ("no unique or exclusion constraint matching the ON CONFLICT
  // specification") that takes out every habit write. These couple them.
  describe("schema and repository agree on the conflict targets", () => {
    it("habits upsert arbitrates on exactly the habits key the schema declares", () => {
      const declared = flat
        .match(/constraint habits_pkey primary key \(([^)]+)\)/i)?.[1]
        .replace(/\s+/g, "");
      // The lookahead stops the match at the next .from(), so it cannot run
      // past this query into another table's conflict target.
      const used = repository.match(
        /from\("habits"\)(?:(?!\.from\()[\s\S])*?onConflict:\s*"([^"]+)"/,
      )?.[1];

      expect(declared).toBe("user_id,id");
      expect(used).toBe(declared);
    });

    it("logs upsert arbitrates on exactly the logs unique constraint", () => {
      const declared = flat
        .match(/constraint logs_user_habit_date_key unique \(([^)]+)\)/i)?.[1]
        .replace(/\s+/g, "");
      const used = repository.match(
        /from\("logs"\)(?:(?!\.from\()[\s\S])*?onConflict:\s*"([^"]+)"/,
      )?.[1];

      expect(declared).toBe("user_id,habit_id,date");
      expect(used).toBe(declared);
    });
  });

  it("still pins user_id to auth.uid() on both tables rather than trusting the client", () => {
    const defaults = sql.match(/user_id uuid not null default auth\.uid\(\)/g) ?? [];
    expect(defaults).toHaveLength(2);
    expect(flat).toMatch(
      /create policy "logs_insert_own" on public\.logs for insert to authenticated with check \(\(select auth\.uid\(\)\) = user_id\)/i,
    );
  });
});
