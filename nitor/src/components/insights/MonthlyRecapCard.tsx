import type { MonthlyRecap } from "@/domain/insights";
import { Wordmark } from "@/components/brand/Wordmark";

const eyebrow =
  "font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.08em] [color:rgb(var(--text-mute))]";
const mono = "font-[family-name:var(--font-mono)] [font-variant-numeric:tabular-nums]";

interface MonthlyRecapCardProps {
  monthLabel: string;
  recap: MonthlyRecap;
}

/**
 * A distinct, designed, screenshot-shareable artifact: the month's stats
 * set large in mono, signed with the Wordmark bottom-right. Flat matte —
 * a slightly heavier hairline than the other cards to read as a keepsake,
 * not just another card in the grid.
 */
export function MonthlyRecapCard({ monthLabel, recap }: MonthlyRecapCardProps) {
  return (
    <div className="rounded-2xl border p-7 [border-color:rgb(var(--hairline)/0.14)] [background:rgb(var(--surface))] md:p-10">
      <p className={eyebrow}>Monthly recap</p>
      <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-medium tracking-tight [color:rgb(var(--text))] md:text-4xl">
        {monthLabel}
      </h2>

      <dl className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-4">
        <div>
          <dt className={eyebrow}>Completion</dt>
          <dd className={`${mono} mt-1 text-2xl [color:rgb(var(--accent))]`}>{recap.completionPct}%</dd>
        </div>
        <div>
          <dt className={eyebrow}>Best streak</dt>
          <dd className={`${mono} mt-1 text-2xl [color:rgb(var(--text))]`}>{recap.bestStreak}</dd>
        </div>
        <div>
          <dt className={eyebrow}>Completions</dt>
          <dd className={`${mono} mt-1 text-2xl [color:rgb(var(--text))]`}>{recap.totalCompletions}</dd>
        </div>
        <div>
          <dt className={eyebrow}>Top habit</dt>
          <dd className="mt-1 truncate text-lg font-medium [color:rgb(var(--text))]">
            {recap.topHabit ?? "—"}
          </dd>
        </div>
      </dl>

      <div className="mt-10 flex justify-end">
        <Wordmark size="text-lg" className="[color:rgb(var(--text-mute))]" />
      </div>
    </div>
  );
}
