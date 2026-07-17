/**
 * Seeds the Supabase `public.quotes` table from the bundled QUOTES pool.
 *
 * Uses a plain `fetch` against the Supabase REST (PostgREST) endpoint with
 * the service-role key rather than the `@supabase/supabase-js` client, so no
 * new dependency is required (the package isn't installed in this repo).
 *
 * Idempotent: upserts on the `text` column (see the unique constraint in
 * supabase/quotes.sql), so re-running this script is safe and will not
 * create duplicate rows.
 *
 * Requires env vars (server-only — never expose SUPABASE_SECRET_KEY to the
 * client; it bypasses RLS):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SECRET_KEY
 *
 * Run after provisioning: `npx tsx --env-file=.env.local scripts/seed-quotes.ts`.
 */
import { QUOTES } from "../src/domain/quotes";

async function main(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SECRET_KEY. " +
        "Set these env vars (server-only) before running this script."
    );
    process.exit(1);
  }

  const res = await fetch(`${url}/rest/v1/quotes?on_conflict=text`, {
    method: "POST",
    headers: {
      apikey: secretKey,
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(
      QUOTES.map((q) => ({
        text: q.text,
        author: q.author,
        source: q.source,
        tradition: q.tradition,
        themes: q.themes,
      }))
    ),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`Seed failed: ${res.status} ${res.statusText}\n${body}`);
    process.exit(1);
  }

  console.log(`Seeded ${QUOTES.length} quotes into public.quotes.`);
}

void main();
