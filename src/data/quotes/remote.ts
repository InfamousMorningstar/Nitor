/**
 * Optional Supabase top-up for the quote pool.
 *
 * The app ships with 58 bundled, verified quotes (src/domain/quotes.ts) and
 * works fully offline on those. When `NEXT_PUBLIC_SUPABASE_URL` and
 * `NEXT_PUBLIC_SUPABASE_ANON_KEY` are configured, this module fetches
 * additional verified quotes from Supabase every 14 days, caches them in
 * localStorage, and merges them into the pool via `setRemoteQuotes`
 * (bundled quotes always win on collision — see quotes.ts).
 *
 * With no env vars set (the current state — Supabase is not provisioned
 * yet), `loadRemoteQuotes` is a no-op and the app runs on the bundled pool.
 */
import type { Quote } from "@/domain/quotes";
import { setRemoteQuotes } from "@/domain/quotes";

const CACHE_KEY = "nitor.quotes.cache";
const AT_KEY = "nitor.quotes.fetchedAt";
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

/** True when a cache written at `fetchedAt` is still within the 14-day freshness window. */
export function isFresh(fetchedAt: number, now = Date.now()): boolean {
  return now - fetchedAt < MAX_AGE_MS;
}

/** Keeps only rows that satisfy the Quote shape with a non-empty, real source. */
export function validateRows(rows: Partial<Quote>[]): Quote[] {
  return rows.filter(
    (r): r is Quote => !!r.text && !!r.author && !!r.source && r.source.trim().length > 0 && !!r.tradition
  );
}

/**
 * Warms the quote pool from any cached remote quotes, then — if Supabase is
 * configured and the cache is stale (>14 days) — fetches fresh quotes,
 * validates them, merges them in, and re-caches. Never throws: on any
 * failure (no env vars, network error, bad response) it silently keeps
 * whatever was already loaded (bundled-only, or the last good cache).
 */
export async function loadRemoteQuotes(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // 1. Warm from cache immediately, regardless of provisioning state.
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) setRemoteQuotes(validateRows(JSON.parse(cached)));
  } catch {
    /* no localStorage (SSR / privacy mode) — stay bundled-only */
  }

  if (!url || !key) return; // not provisioned → bundled-only

  try {
    const at = Number(localStorage.getItem(AT_KEY) ?? 0);
    if (isFresh(at, Date.now())) return; // cache still fresh
  } catch {
    /* localStorage unavailable — fall through and try a fetch anyway */
  }

  try {
    const res = await fetch(`${url}/rest/v1/quotes?select=text,author,source,tradition,themes`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return;
    const rows = validateRows(await res.json());
    setRemoteQuotes(rows);
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(rows));
      localStorage.setItem(AT_KEY, String(Date.now()));
    } catch {
      /* cache write failed — remote quotes are still applied for this session */
    }
  } catch {
    /* network error — keep last good cache */
  }
}
