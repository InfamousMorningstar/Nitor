"use client";
import { useState } from "react";
import { quoteOfDay } from "@/domain/quotes";
import { today } from "@/domain/dates";

/**
 * A slim, dismissible (not modal) card at the top of Today. Flat surface,
 * hairline border, no glass. Dismiss hides it for the session only (no
 * persistence — it should reappear on the next visit/reload).
 */
export function QuoteCard() {
  const [dismissed, setDismissed] = useState(false);
  const quote = quoteOfDay(today());

  if (dismissed) return null;

  return (
    <div className="relative mb-6 rounded-2xl border [border-color:rgb(var(--hairline)/0.08)] [background:rgb(var(--surface))] px-5 py-4 sm:px-6 sm:py-5">
      <button
        type="button"
        aria-label="Dismiss quote"
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full text-sm [color:rgb(var(--text-mute))] transition-colors duration-[var(--dur-micro)] [transition-timing-function:var(--ease)] hover:[background:rgb(var(--surface-2))] hover:[color:rgb(var(--text-dim))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]"
      >
        ×
      </button>
      <p className="max-w-[560px] pr-8 text-xl italic leading-relaxed [font-family:'Times_New_Roman',Times,serif] [color:rgb(var(--text))] sm:text-2xl">
        &ldquo;{quote.text}&rdquo;
      </p>
      <p className="mt-3 font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.06em] [color:rgb(var(--text-mute))]">
        {quote.author} &mdash; {quote.source}
      </p>
    </div>
  );
}
