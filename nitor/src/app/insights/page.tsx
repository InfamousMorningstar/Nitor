"use client";
import { AppFrame } from "@/components/app/AppFrame";
import { StoryCard } from "@/components/insights/StoryCard";
import { InsightCard } from "@/components/insights/InsightCard";
import { useHabits } from "@/state/useHabits";
import { computeInsights } from "@/domain/insights";

export default function InsightsPage() {
  const { habits, logs, loading } = useHabits();
  const insights = computeInsights(habits, logs);
  const story = insights.find((i) => i.kind === "story");
  const cards = insights.filter((i) => i.kind !== "story");

  return (
    <AppFrame>
      <header className="mb-8">
        <p className="font-[family-name:var(--font-geist-mono)] text-xs uppercase tracking-[0.08em] [color:rgb(var(--muted))]">
          Weekly review
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight">
          Insights
        </h1>
        <p className="mt-1 text-sm [color:rgb(var(--muted))]">
          Why you succeed — not just whether.
        </p>
      </header>

      {loading ? (
        <p className="[color:rgb(var(--muted))]">Loading…</p>
      ) : (
        <div className="space-y-4">
          {story && <StoryCard insight={story} />}
          {cards.length > 0 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {cards.map((i) => (
                <InsightCard key={i.id} insight={i} />
              ))}
            </div>
          )}
        </div>
      )}
    </AppFrame>
  );
}
