"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/state/SessionProvider";
import { createClient } from "@/lib/supabase/client";
import { Wordmark } from "@/components/brand/Wordmark";
import { NixCreature } from "@/components/pet/NixCreature";
import { HABIT_TEMPLATES } from "@/domain/habitTemplates";
import { useRepository } from "@/state/RepositoryProvider";
import { useSettingsStore } from "@/state/settingsStore";
import { today } from "@/domain/dates";
import type { Habit } from "@/domain/types";
import { eyebrow, fieldInput, primaryButton, ghostButton } from "@/components/auth/formKit";

const REMINDER_WINDOWS = ["Morning", "Afternoon", "Evening", "Anytime"] as const;
type ReminderWindow = (typeof REMINDER_WINDOWS)[number];

const TOTAL_STEPS = 3;
const MAX_TEMPLATES = 3;

function newHabitId(): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `h_${Date.now()}_${rand}`;
}

/**
 * ≤3-step, skippable first-run flow. One question per screen: starter
 * habits, reminder window, meet-and-name Nix. Nothing here is required —
 * Skip drops straight into /today with the store's existing defaults.
 */
export default function OnboardingPage() {
  const router = useRouter();
  const { user, profile } = useSession();
  const repo = useRepository();
  const setPetName = useSettingsStore((s) => s.setPetName);

  // Already-onboarded users never see this flow again. Client-side gating is
  // deliberate: guarding it in proxy.ts would cost a DB query per request to
  // buy very little. Note: after handleFinish writes the flag, `profile` is
  // not re-fetched this session, so this relies on a fresh load to fire.
  useEffect(() => {
    if (profile?.onboarding_completed) router.replace("/today");
  }, [profile, router]);

  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [reminder, setReminder] = useState<ReminderWindow>("Morning");
  const [petNameInput, setPetNameInput] = useState("Nix");
  const [finishing, setFinishing] = useState(false);

  function toggleTemplate(name: string) {
    setSelected((prev) => {
      if (prev.includes(name)) return prev.filter((n) => n !== name);
      if (prev.length >= MAX_TEMPLATES) return prev;
      return [...prev, name];
    });
  }

  async function handleFinish() {
    if (finishing) return;
    setFinishing(true);
    setPetName(petNameInput);

    const chosen = HABIT_TEMPLATES.filter((t) => selected.includes(t.name));
    try {
      for (const t of chosen) {
        const habit: Habit = {
          id: newHabitId(),
          name: t.name,
          emoji: t.emoji,
          color: t.color,
          category: "Personal",
          type: t.type,
          targetValue: t.targetValue ?? null,
          schedule: { ...t.schedule },
          strictness: "balanced",
          graceDaysPerWeek: 1,
          archived: false,
          createdAt: today(),
          ...(t.unit ? { unit: t.unit } : {}),
        };
        await repo.upsertHabit(habit);
      }
    } catch {
      // Best-effort — never block onboarding completion on a repo error.
    }

    // Persist completion so the gating effect above redirects on next load.
    // RLS allows updating only your own row (profiles_update_own).
    if (user) {
      const supabase = createClient();
      await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("id", user.id);
    }

    router.push("/today");
  }

  function handleSkip() {
    router.push("/today");
  }

  const canAdvanceFromStep1 = selected.length >= 1;

  return (
    <div className="flex min-h-screen w-full flex-col [background:rgb(var(--bg))]">
      <header className="flex items-center justify-between px-6 py-6 sm:px-10">
        <Wordmark size="text-xl" className="[color:rgb(var(--text))]" />
        <button type="button" onClick={handleSkip} className={ghostButton}>
          Skip
        </button>
      </header>

      <div className="flex flex-1 items-center justify-center px-6 pb-16">
        <div className="w-full max-w-[560px]">
          {step === 1 && (
            <section>
              <p className={eyebrow}>Step 1 of 3</p>
              <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight [color:rgb(var(--text))]">
                Pick a few habits to start
              </h1>
              <p className="mt-2 text-[15px] [color:rgb(var(--text-dim))]">
                Choose 1&ndash;3. You can add or change these anytime.
              </p>

              <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {HABIT_TEMPLATES.map((t) => {
                  const on = selected.includes(t.name);
                  const disabled = !on && selected.length >= MAX_TEMPLATES;
                  return (
                    <button
                      key={t.name}
                      type="button"
                      onClick={() => toggleTemplate(t.name)}
                      aria-pressed={on}
                      disabled={disabled}
                      className={
                        "flex flex-col items-start gap-1.5 rounded-xl border px-3 py-3 text-left transition-colors duration-[var(--dur-micro)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))] disabled:opacity-40 " +
                        (on
                          ? "border-[rgb(var(--accent))] [background:rgb(var(--surface-2))]"
                          : "[border-color:rgb(var(--hairline)/0.1)] [background:rgb(var(--surface))] hover:[border-color:rgb(var(--hairline)/0.2)]")
                      }
                    >
                      <span className="text-xl" aria-hidden="true">
                        {t.emoji}
                      </span>
                      <span className={"text-[13px] leading-snug " + (on ? "[color:rgb(var(--accent))]" : "[color:rgb(var(--text))]")}>
                        {t.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              <p className={`${eyebrow} mt-4`}>{selected.length}/{MAX_TEMPLATES} selected</p>
            </section>
          )}

          {step === 2 && (
            <section>
              <p className={eyebrow}>Step 2 of 3</p>
              <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight [color:rgb(var(--text))]">
                When should we remind you?
              </h1>
              <p className="mt-2 text-[15px] [color:rgb(var(--text-dim))]">
                Pick the window that fits your day.
              </p>

              <div className="mt-8 grid grid-cols-2 gap-2">
                {REMINDER_WINDOWS.map((w) => {
                  const on = reminder === w;
                  return (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setReminder(w)}
                      aria-pressed={on}
                      className={
                        "rounded-xl border px-4 py-4 text-left transition-colors duration-[var(--dur-micro)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))] " +
                        (on
                          ? "border-[rgb(var(--accent))] [background:rgb(var(--surface-2))]"
                          : "[border-color:rgb(var(--hairline)/0.1)] [background:rgb(var(--surface))] hover:[border-color:rgb(var(--hairline)/0.2)]")
                      }
                    >
                      <span className={"text-[15px] font-medium " + (on ? "[color:rgb(var(--accent))]" : "[color:rgb(var(--text))]")}>
                        {w}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {step === 3 && (
            <section>
              <p className={eyebrow}>Step 3 of 3</p>
              <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight [color:rgb(var(--text))]">
                Meet your pet
              </h1>
              <p className="mt-2 text-[15px] [color:rgb(var(--text-dim))]">
                Nix grows brighter as you keep your streaks. Give it a name.
              </p>

              <div className="mt-8 flex flex-col items-center">
                <NixCreature glow={0.15} state="sleepy" size={160} />

                <div className="mt-8 w-full max-w-[280px]">
                  <label htmlFor="pet-name" className={`${eyebrow} mb-2 block text-center`}>
                    Pet name
                  </label>
                  <input
                    id="pet-name"
                    value={petNameInput}
                    onChange={(e) => setPetNameInput(e.target.value)}
                    placeholder="Nix"
                    maxLength={20}
                    className={`${fieldInput} text-center`}
                  />
                </div>
              </div>
            </section>
          )}

          <nav className="mt-10 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              disabled={step === 1}
              className={`${ghostButton} disabled:opacity-0 disabled:pointer-events-none`}
            >
              &larr; Back
            </button>

            <div className="flex items-center gap-2" aria-hidden="true">
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full transition-colors duration-[var(--dur-micro)]"
                  style={{
                    background:
                      i + 1 === step
                        ? "rgb(var(--accent))"
                        : "rgb(var(--hairline) / 0.2)",
                  }}
                />
              ))}
            </div>

            {step < TOTAL_STEPS ? (
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(TOTAL_STEPS, s + 1))}
                disabled={step === 1 && !canAdvanceFromStep1}
                className={`${primaryButton} w-auto px-6 py-2.5`}
              >
                Next &rarr;
              </button>
            ) : (
              <button type="button" onClick={handleFinish} disabled={finishing} className={`${primaryButton} w-auto px-6 py-2.5`}>
                Finish
              </button>
            )}
          </nav>
        </div>
      </div>
    </div>
  );
}
