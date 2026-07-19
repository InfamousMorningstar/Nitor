import { create } from "zustand";
import { persist } from "zustand/middleware";
import { today } from "@/domain/dates";

export type Density = "comfortable" | "compact";
export type QuoteFrequency = "daily" | "off";

export interface CuratedAccent {
  hex: string;
  label: string;
  /** space-separated RGB triplet for --accent */
  rgb: string;
  /** space-separated RGB triplet for --accent-glow */
  glow: string;
}

/**
 * Five curated accents. Everything else in the app stays grayscale — the
 * accent only ever recolors the single "accent" role (primary actions,
 * active states, streak flames, pet glow).
 */
export const CURATED_ACCENTS: CuratedAccent[] = [
  { hex: "#F5B027", label: "Amber", rgb: "245 176 39", glow: "255 194 75" },
  { hex: "#14B8A6", label: "Teal", rgb: "20 184 166", glow: "45 212 191" },
  { hex: "#3B82F6", label: "Blue", rgb: "59 130 246", glow: "96 165 250" },
  { hex: "#8B5CF6", label: "Violet", rgb: "139 92 246", glow: "167 139 250" },
  { hex: "#F43F5E", label: "Rose", rgb: "244 63 94", glow: "251 113 133" },
];

const DEFAULT_ACCENT = CURATED_ACCENTS[0].hex;

/** Pushes the curated accent's RGB triplets onto the document root. */
export function applyAccentVars(accentHex: string) {
  if (typeof document === "undefined") return;
  const curated = CURATED_ACCENTS.find((a) => a.hex.toLowerCase() === accentHex.toLowerCase());
  const rgb = curated?.rgb ?? CURATED_ACCENTS[0].rgb;
  const glow = curated?.glow ?? CURATED_ACCENTS[0].glow;
  document.documentElement.style.setProperty("--accent", rgb);
  document.documentElement.style.setProperty("--accent-glow", glow);
}

/** Reflects the reduce-motion preference as a root attribute a global CSS rule can key off. */
export function applyReduceMotion(reduceMotion: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-reduce-motion", String(reduceMotion));
}

interface SettingsState {
  accent: string;
  density: Density;
  reduceMotion: boolean;
  weekStartsOn: 0 | 1;
  dayRolloverHour: number;
  streakFreeze: boolean;
  vacationMode: boolean;
  /**
   * The date vacation mode was switched on, or null when it is off. Streaks
   * forgive scheduled days from this date onward.
   *
   * Stored alongside the boolean because the boolean alone cannot say WHEN it
   * became true, and streak maths walks history — without an anchor, turning
   * vacation on would forgive every past miss ever recorded.
   */
  vacationSince: string | null;
  quotesEnabled: boolean;
  quoteTraditions: string[];
  quoteFrequency: QuoteFrequency;
  petName: string;
  petAnimation: boolean;
  petSpriteMode: boolean;

  // Notifications — stubbed front-end prefs only, no delivery is wired up.
  notifyPush: boolean;
  notifyEmail: boolean;
  quietHoursStart: string; // "HH:MM"
  quietHoursEnd: string; // "HH:MM"
  weeklyDigest: boolean;

  setAccent: (accent: string) => void;
  setDensity: (density: Density) => void;
  setReduceMotion: (reduceMotion: boolean) => void;
  setWeekStartsOn: (day: 0 | 1) => void;
  setDayRolloverHour: (hour: number) => void;
  setStreakFreeze: (on: boolean) => void;
  setVacationMode: (on: boolean) => void;
  setQuotesEnabled: (on: boolean) => void;
  setQuoteTraditions: (traditions: string[]) => void;
  toggleQuoteTradition: (tradition: string) => void;
  setQuoteFrequency: (frequency: QuoteFrequency) => void;
  setPetName: (name: string) => void;
  setPetAnimation: (on: boolean) => void;
  setPetSpriteMode: (on: boolean) => void;

  setNotifyPush: (on: boolean) => void;
  setNotifyEmail: (on: boolean) => void;
  setQuietHoursStart: (time: string) => void;
  setQuietHoursEnd: (time: string) => void;
  setWeeklyDigest: (on: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      accent: DEFAULT_ACCENT,
      density: "comfortable",
      reduceMotion: false,
      weekStartsOn: 1,
      dayRolloverHour: 0,
      streakFreeze: true,
      vacationMode: false,
      vacationSince: null,
      quotesEnabled: true,
      quoteTraditions: ["stoic", "science", "wisdom", "history", "craft"],
      quoteFrequency: "daily",
      petName: "Nix",
      petAnimation: true,
      petSpriteMode: false,

      notifyPush: false,
      notifyEmail: false,
      quietHoursStart: "22:00",
      quietHoursEnd: "07:00",
      weeklyDigest: false,

      setAccent: (accent) => {
        set({ accent });
        applyAccentVars(accent);
      },
      setDensity: (density) => set({ density }),
      setReduceMotion: (reduceMotion) => {
        set({ reduceMotion });
        applyReduceMotion(reduceMotion);
      },
      setWeekStartsOn: (weekStartsOn) => set({ weekStartsOn }),
      setDayRolloverHour: (dayRolloverHour) => set({ dayRolloverHour }),
      setStreakFreeze: (streakFreeze) => set({ streakFreeze }),
      // Switching on anchors the window to today; switching off clears it, so
      // protection stops without retroactively rewriting past days.
      setVacationMode: (vacationMode) =>
        set({
          vacationMode,
          vacationSince: vacationMode ? today(get().dayRolloverHour) : null,
        }),
      setQuotesEnabled: (quotesEnabled) => set({ quotesEnabled }),
      setQuoteTraditions: (quoteTraditions) => set({ quoteTraditions }),
      toggleQuoteTradition: (tradition) => {
        const current = get().quoteTraditions;
        set({
          quoteTraditions: current.includes(tradition)
            ? current.filter((t) => t !== tradition)
            : [...current, tradition],
        });
      },
      setQuoteFrequency: (quoteFrequency) => set({ quoteFrequency }),
      setPetName: (petName) => set({ petName: petName.trim() || "Nix" }),
      setPetAnimation: (petAnimation) => set({ petAnimation }),
      setPetSpriteMode: (petSpriteMode) => set({ petSpriteMode }),

      setNotifyPush: (notifyPush) => set({ notifyPush }),
      setNotifyEmail: (notifyEmail) => set({ notifyEmail }),
      setQuietHoursStart: (quietHoursStart) => set({ quietHoursStart }),
      setQuietHoursEnd: (quietHoursEnd) => set({ quietHoursEnd }),
      setWeeklyDigest: (weeklyDigest) => set({ weeklyDigest }),
    }),
    {
      name: "nitor-settings",
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        applyAccentVars(state.accent);
        applyReduceMotion(state.reduceMotion);
      },
    }
  )
);
