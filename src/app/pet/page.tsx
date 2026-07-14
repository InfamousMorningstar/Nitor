"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppFrame } from "@/components/app/AppFrame";
import { NixCreature, type NixState } from "@/components/pet/NixCreature";
import { useHabits } from "@/state/useHabits";
import { usePetStore, unlockedAccessories } from "@/state/petStore";
import { useSettingsStore } from "@/state/settingsStore";
import {
  glowRate,
  moodFromGlow,
  activeDayCount,
  evolutionProgress,
  bestStreakDays,
  buildMemoryLog,
  WARDROBE_ITEMS,
  EVOLUTION_STAGES,
} from "@/domain/pet";

const eyebrow =
  "font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.08em] [color:rgb(var(--text-mute))]";
const mono = "font-[family-name:var(--font-mono)] [font-variant-numeric:tabular-nums]";
const card =
  "rounded-2xl border p-5 sm:p-6 [border-color:rgb(var(--hairline)/0.08)] [background:rgb(var(--surface))]";

const MOOD_COPY: Record<string, string> = {
  radiant: "Radiant. You've been showing up all week.",
  glowing: "Glowing. Steady, consistent week.",
  idle: "Idle. A few completions would brighten things up.",
  sleepy: "Sleepy. Nix dims when the week's been quiet — that's all that happens.",
};

export default function PetPage() {
  const { habits, logs, loading } = useHabits();
  const petName = useSettingsStore((s) => s.petName);
  const { food, feed, equipped, setEquipped } = usePetStore();

  const [eating, setEating] = useState(false);
  const eatTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (eatTimeout.current) clearTimeout(eatTimeout.current); }, []);

  const glow = useMemo(() => glowRate(habits, logs), [habits, logs]);
  const mood = moodFromGlow(glow);
  const activeDays = useMemo(() => activeDayCount(habits, logs), [habits, logs]);
  const evo = evolutionProgress(activeDays);
  const best = useMemo(() => bestStreakDays(habits, logs), [habits, logs]);
  const memory = useMemo(() => buildMemoryLog(habits, logs, petName), [habits, logs, petName]);
  const unlockedIds = useMemo(() => new Set(unlockedAccessories(best)), [best]);

  const creatureState: NixState = eating ? "eating" : mood === "sleepy" ? "sleepy" : mood === "radiant" ? "radiant" : "idle";

  function handleFeed() {
    feed(1);
    setEating(true);
    if (eatTimeout.current) clearTimeout(eatTimeout.current);
    eatTimeout.current = setTimeout(() => setEating(false), 380);
  }

  const equippedItem = WARDROBE_ITEMS.find((w) => w.id === equipped) ?? WARDROBE_ITEMS[0];

  return (
    <AppFrame>
      <header className="mb-6">
        <p className={eyebrow}>Companion</p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight [color:rgb(var(--text))]">
          Pet
        </h1>
      </header>

      {loading ? (
        <p className="[color:rgb(var(--text-mute))]">Loading&hellip;</p>
      ) : (
        <div className="max-w-[1000px] space-y-6">
          {/* Hero — the creature's glow is the focal point of this whole page. */}
          <section className={`${card} flex flex-col items-center gap-4 py-10 text-center`}>
            <NixCreature glow={glow} state={creatureState} equipped={equipped} size={220} />
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight [color:rgb(var(--text))]">
                {petName}
              </h2>
              <p className={`${mono} mt-1 text-sm [color:rgb(var(--text-dim))]`}>
                Glow <span className="[color:rgb(var(--accent))]">{Math.round(glow * 100)}%</span>
                <span className="[color:rgb(var(--text-mute))]"> &middot; {evo.stage.label}</span>
                {equippedItem.id !== "none" && (
                  <span className="[color:rgb(var(--text-mute))]"> &middot; wearing {equippedItem.label}</span>
                )}
              </p>
            </div>
            <p className="max-w-md text-sm leading-relaxed [color:rgb(var(--text-dim))]">
              {MOOD_COPY[mood]}
            </p>
            <p className={`${eyebrow} max-w-md !normal-case tracking-normal [color:rgb(var(--text-mute))]`}>
              {petName} only ever dims. It never guilts you, never cries, and never resets — glow always
              recovers the moment you show up again.
            </p>
          </section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Food balance */}
            <section className={card}>
              <h3 className="mb-1 text-sm font-medium [color:rgb(var(--text))]">Food</h3>
              <p className="mb-4 text-sm leading-relaxed [color:rgb(var(--text-dim))]">
                Feeding is a deliberate act, not an obligation — there's no penalty for skipping it.
              </p>
              <div className="flex items-center justify-between gap-4">
                <p className={`${mono} text-3xl font-medium [color:rgb(var(--text))]`}>
                  {food}
                  <span className={`${eyebrow} ml-2 !normal-case tracking-normal`}>units fed</span>
                </p>
                <button
                  type="button"
                  onClick={handleFeed}
                  className="shrink-0 rounded-full px-5 py-2.5 text-sm font-medium transition-transform duration-[var(--dur-micro)] active:scale-[0.97] [background:rgb(var(--accent))] [color:rgb(var(--bg))] hover:[background:rgb(var(--accent-glow))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]"
                >
                  Feed {petName}
                </button>
              </div>
            </section>

            {/* Evolution track */}
            <section className={card}>
              <h3 className="mb-1 text-sm font-medium [color:rgb(var(--text))]">Evolution</h3>
              <p className="mb-4 text-sm leading-relaxed [color:rgb(var(--text-dim))]">
                {activeDays} active {activeDays === 1 ? "day" : "days"} logged
                {evo.next ? ` — ${evo.daysToNext} more to ${evo.next.label}.` : " — fully evolved."}
              </p>

              <div className="flex items-center gap-2">
                {EVOLUTION_STAGES.map((stage, i) => {
                  const reached = i <= evo.stageIndex;
                  const isCurrent = i === evo.stageIndex;
                  return (
                    <div key={stage.key} className="flex flex-1 flex-col items-center gap-1.5">
                      <div
                        className={`h-1 w-full rounded-full ${reached ? "[background:rgb(var(--accent))]" : "[background:rgb(var(--hairline)/0.12)]"}`}
                      />
                      <span
                        className={`${mono} text-[10px] uppercase tracking-[0.05em] ${
                          isCurrent ? "[color:rgb(var(--accent))]" : reached ? "[color:rgb(var(--text-dim))]" : "[color:rgb(var(--text-mute))]"
                        }`}
                      >
                        {stage.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Wardrobe */}
          <section className={card}>
            <h3 className="mb-1 text-sm font-medium [color:rgb(var(--text))]">Wardrobe</h3>
            <p className="mb-4 text-sm leading-relaxed [color:rgb(var(--text-dim))]">
              Cosmetic unlocks at streak milestones. Nothing here is ever purchasable — the only currency
              is showing up. Best streak so far: <span className={mono}>{best}</span> days.
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
              {WARDROBE_ITEMS.map((item) => {
                const unlocked = unlockedIds.has(item.id);
                const selected = equipped === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={!unlocked}
                    onClick={() => unlocked && setEquipped(item.id)}
                    aria-pressed={selected}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-4 text-center transition-colors duration-[var(--dur-micro)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))] ${
                      selected
                        ? "border-[rgb(var(--accent))] [background:rgb(var(--surface-2))]"
                        : unlocked
                          ? "[border-color:rgb(var(--hairline)/0.12)] hover:[border-color:rgb(var(--hairline)/0.24)]"
                          : "cursor-not-allowed [border-color:rgb(var(--hairline)/0.06)] opacity-50"
                    }`}
                  >
                    <span className="text-sm [color:rgb(var(--text))]">{item.label}</span>
                    <span className={`${mono} text-[10px] uppercase tracking-[0.05em] [color:rgb(var(--text-mute))]`}>
                      {unlocked ? (selected ? "Equipped" : "Unlocked") : `Streak ${item.milestone}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Memory log */}
          <section className={card}>
            <h3 className="mb-4 text-sm font-medium [color:rgb(var(--text))]">Memory log</h3>
            {memory.length === 0 ? (
              <p className="text-sm [color:rgb(var(--text-mute))]">No milestones yet — log a habit to begin.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {memory.map((entry) => (
                  <li key={entry.id} className="flex items-center gap-3">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full [background:rgb(var(--accent))]" aria-hidden="true" />
                    <span className="flex-1 text-sm [color:rgb(var(--text))]">{entry.label}</span>
                    <span className={`${mono} shrink-0 text-xs [color:rgb(var(--text-mute))]`}>{entry.date}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </AppFrame>
  );
}
