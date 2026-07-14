"use client";
import { AppFrame } from "@/components/app/AppFrame";
import { StoryCard } from "@/components/insights/StoryCard";
import { InsightCard } from "@/components/insights/InsightCard";
import { CorrelationCard } from "@/components/insights/CorrelationCard";
import { StreakRiskCard } from "@/components/insights/StreakRiskCard";
import { StackingCard } from "@/components/insights/StackingCard";
import { MonthlyRecapCard } from "@/components/insights/MonthlyRecapCard";
import { useHabits } from "@/state/useHabits";
import {
  computeInsights,
  correlationInsight,
  streakRisk,
  stackingSuggestion,
  monthlyRecap,
} from "@/domain/insights";
import { today } from "@/domain/dates";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function InsightsPage() {
  const { habits, logs, loading } = useHabits();

  const date = today();
  const [yearStr, monthStr] = date.split("-");
  const month = `${yearStr}-${monthStr}`;
  const monthLabel = `${MONTH_NAMES[Number(monthStr) - 1]} ${yearStr}`;

  const insights = computeInsights(habits, logs);
  const story = insights.find((i) => i.kind === "story");
  const bestTime = insights.find((i) => i.kind === "best_time");

  const correlation = correlationInsight(habits, logs);
  const risk = streakRisk(habits, logs, date);
  const stacking = stackingSuggestion(habits, logs);
  const recap = monthlyRecap(habits, logs, month);

  return (
    <AppFrame>
      <header className="mb-8">
        <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.08em] [color:rgb(var(--text-mute))]">
          Weekly review
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight [color:rgb(var(--text))]">
          Insights
        </h1>
        <p className="mt-1 text-sm [color:rgb(var(--text-dim))]">
          Why you succeed — not just whether.
        </p>
      </header>

      {loading ? (
        <p className="[color:rgb(var(--text-mute))]">Reading your week&hellip;</p>
      ) : (
        <div className="max-w-[1000px] space-y-6">
          {story && <StoryCard insight={story} />}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {bestTime && <InsightCard insight={bestTime} />}
            <CorrelationCard correlation={correlation} />
            {risk && <StreakRiskCard risk={risk} />}
            {stacking && <StackingCard stacking={stacking} />}
          </div>

          <MonthlyRecapCard monthLabel={monthLabel} recap={recap} />
        </div>
      )}
    </AppFrame>
  );
}
