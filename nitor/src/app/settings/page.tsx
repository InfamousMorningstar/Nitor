"use client";
import { AppFrame } from "@/components/app/AppFrame";
import { useTheme } from "@/state/theme";
import { useHabits } from "@/state/useHabits";

const eyebrow =
  "font-[family-name:var(--font-geist-mono)] text-xs uppercase tracking-[0.08em] [color:rgb(var(--muted))]";
const mono = "font-[family-name:var(--font-geist-mono)] [font-variant-numeric:tabular-nums]";
const card =
  "rounded-[28px] border [border-color:rgb(var(--hairline)/0.10)] [background:rgb(var(--bg-elev))] p-6";

export default function SettingsPage() {
  const { theme, glass, setTheme, setGlass } = useTheme();
  const { habits, logs } = useHabits();

  function exportData() {
    const blob = new Blob([JSON.stringify({ habits, logs }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nitor-export.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppFrame>
      <header className="mb-8">
        <p className={eyebrow}>Preferences</p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight">
          Settings
        </h1>
        <p className="mt-1 text-sm [color:rgb(var(--muted))]">
          Tune how Nitor looks, and keep a copy of your data.
        </p>
      </header>

      <div className="max-w-2xl space-y-4">
        <section className={card}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Appearance</p>
              <p className="mt-1 text-sm [color:rgb(var(--muted))]">
                Switch between light and dark.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors [background:rgb(var(--muted)/0.12)]"
            >
              {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
            </button>
          </div>
        </section>

        <section className={card}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Glass intensity</p>
              <p className="mt-1 text-sm [color:rgb(var(--muted))]">
                How much the sidebar and cards refract the light behind them.
              </p>
            </div>
            <span className={`${mono} shrink-0 text-sm [color:rgb(var(--nitor))]`}>
              {Math.round(glass * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={glass}
            onChange={(e) => setGlass(Number(e.target.value))}
            className="mt-4 w-full accent-[rgb(var(--nitor))]"
          />
        </section>

        <section className={card}>
          <p className="text-sm font-medium">Your data</p>
          <p className="mt-1 text-sm [color:rgb(var(--muted))]">
            Download everything Nitor has stored for you — habits and logs — as a plain JSON file.
          </p>
          <button
            type="button"
            onClick={exportData}
            className="mt-4 w-full rounded-2xl py-3 text-sm font-medium text-white transition-transform duration-150 active:scale-[0.98] [background:rgb(var(--nitor))] sm:w-auto sm:px-6"
          >
            Export my data (JSON)
          </button>
        </section>
      </div>
    </AppFrame>
  );
}
