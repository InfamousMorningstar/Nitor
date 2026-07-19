"use client";
import { useRef, useState, type ReactNode } from "react";
import { AppFrame } from "@/components/app/AppFrame";
import { useTheme } from "@/state/theme";
import { useHabits } from "@/state/useHabits";
import { useSettingsStore, CURATED_ACCENTS } from "@/state/settingsStore";
import { logsToCsv } from "@/domain/csv";

const eyebrow =
  "font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.08em] [color:rgb(var(--text-mute))]";
const mono = "font-[family-name:var(--font-mono)] [font-variant-numeric:tabular-nums]";
const sectionCard =
  "overflow-hidden rounded-2xl border [border-color:rgb(var(--hairline)/0.08)] [background:rgb(var(--surface))]";
const rowBase = "flex flex-wrap items-start justify-between gap-4 px-5 py-4 sm:px-6";
const fieldInput =
  "rounded-lg border px-3 py-2 text-sm outline-none transition-colors duration-[var(--dur-micro)] [border-color:rgb(var(--hairline)/0.12)] [background:rgb(var(--surface-2))] [color:rgb(var(--text))] placeholder:[color:rgb(var(--text-mute))] focus:[border-color:rgb(var(--accent))]";
const pillButton =
  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-[var(--dur-micro)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]";
const pillInactive =
  "[border-color:rgb(var(--hairline)/0.12)] [color:rgb(var(--text-dim))] hover:[border-color:rgb(var(--hairline)/0.24)]";
const pillActive = "border-[rgb(var(--accent))] [color:rgb(var(--accent))]";

const TRADITIONS: { id: string; label: string }[] = [
  { id: "stoic", label: "Stoic" },
  { id: "science", label: "Science" },
  { id: "wisdom", label: "Wisdom traditions" },
  { id: "history", label: "History" },
  { id: "craft", label: "Craft" },
];

const PROVIDERS = ["Google", "Apple", "GitHub"];

const ROLLOVER_HOURS = [0, 1, 2, 3, 4, 5, 6];

function downloadFile(content: string, mime: string, filename: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Flat matte on/off switch — no color beyond the single accent role. */
function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-[var(--dur-micro)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))] ${
        checked
          ? "border-transparent [background:rgb(var(--accent))]"
          : "[border-color:rgb(var(--hairline)/0.16)] [background:rgb(var(--surface-2))]"
      }`}
    >
      <span
        className="absolute top-1 left-1 h-4 w-4 rounded-full transition-transform duration-[var(--dur-micro)] [transition-timing-function:var(--ease)]"
        style={{
          transform: checked ? "translateX(20px)" : "translateX(0)",
          background: checked ? "rgb(var(--bg))" : "rgb(var(--text-mute))",
        }}
      />
    </button>
  );
}

/** Row of pill buttons acting as a single-select control. */
function PillSelect({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`${pillButton} ${value === o.value ? pillActive : pillInactive}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

interface SettingRow {
  id: string;
  title: string;
  description: string;
  control: ReactNode;
}

function filterRows(rows: SettingRow[], query: string): SettingRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter(
    (r) => r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)
  );
}

function Section({ title, rows }: { title: string; rows: SettingRow[] }) {
  if (rows.length === 0) return null;
  return (
    <section>
      <h2 className={`${eyebrow} mb-2 px-1`}>{title}</h2>
      <div className={`${sectionCard} divide-y divide-[rgb(var(--hairline)/0.08)]`}>
        {rows.map((row) => (
          <div key={row.id} className={rowBase}>
            <div className="min-w-[220px] flex-1">
              <p className="text-[14px] font-medium [color:rgb(var(--text))]">{row.title}</p>
              <p className="mt-0.5 text-[13px] leading-snug [color:rgb(var(--text-mute))]">
                {row.description}
              </p>
            </div>
            <div className="shrink-0">{row.control}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function SettingsPage() {
  const { theme, followsSystem, setTheme, setSystemTheme } = useTheme();
  const { habits, logs } = useHabits();
  const settings = useSettingsStore();
  const [search, setSearch] = useState("");

  // Account (stubbed — no backend yet)
  const [displayName, setDisplayName] = useState("");
  const [pwStub, setPwStub] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleted, setDeleted] = useState(false);

  // Data — import stub
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Local draft so an in-progress edit (e.g. clearing the field to retype)
  // isn't clobbered by the store's "fall back to Nix when empty" guard on
  // every keystroke — that guard only applies once the field is committed.
  const [petNameDraft, setPetNameDraft] = useState(settings.petName);

  function exportJson() {
    downloadFile(JSON.stringify({ habits, logs }, null, 2), "application/json", "nitor-export.json");
  }

  function exportCsv() {
    downloadFile(logsToCsv(habits, logs), "text/csv", "nitor-logs.csv");
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      console.log("Nitor import (stub — not merged):", parsed);
      const habitCount = Array.isArray(parsed?.habits) ? parsed.habits.length : 0;
      const logCount = Array.isArray(parsed?.logs) ? parsed.logs.length : 0;
      setImportStatus(
        `Read ${habitCount} habit${habitCount === 1 ? "" : "s"} and ${logCount} log${logCount === 1 ? "" : "s"} from the file. Merging into your data isn't wired up yet — check the console for the parsed contents.`
      );
    } catch {
      setImportStatus("Couldn't parse that file — expected the JSON export format.");
    }
  }

  const themeValue = followsSystem ? "system" : theme;

  const sections: { title: string; rows: SettingRow[] }[] = [
    {
      title: "Account",
      rows: [
        {
          id: "display-name",
          title: "Display name",
          description: "What Nitor calls you around the app.",
          control: (
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className={`${fieldInput} w-44`}
            />
          ),
        },
        {
          id: "email",
          title: "Email",
          description: "Read-only for now — changing your email isn't available yet.",
          control: (
            <input
              value="you@example.com"
              readOnly
              disabled
              className={`${fieldInput} w-44 opacity-60`}
            />
          ),
        },
        {
          id: "change-password",
          title: "Change password",
          description: "Update the password on your account.",
          control: (
            <div className="flex flex-col items-end gap-1">
              <button
                type="button"
                onClick={() => setPwStub(true)}
                className={`${pillButton} ${pillInactive}`}
              >
                Change password
              </button>
              {pwStub && (
                <span className="text-[11px] [color:rgb(var(--text-mute))]">
                  Changing your password here isn&rsquo;t available yet.
                </span>
              )}
            </div>
          ),
        },
        {
          id: "connected-accounts",
          title: "Connected accounts",
          description: "Link a provider to sign in faster. Nothing is wired up yet.",
          control: (
            <div className="flex flex-col items-end gap-2">
              {PROVIDERS.map((p) => (
                <div key={p} className="flex items-center gap-2">
                  <span className="w-14 text-right text-[12px] [color:rgb(var(--text-dim))]">
                    {p}
                  </span>
                  <span
                    className={`${pillButton} cursor-default [border-color:rgb(var(--hairline)/0.12)] [color:rgb(var(--text-mute))]`}
                  >
                    Not connected
                  </span>
                </div>
              ))}
            </div>
          ),
        },
        {
          id: "delete-account",
          title: "Delete account",
          description:
            'Type "delete" to confirm. Account deletion isn\'t available yet — nothing is removed. Email me and I\'ll do it by hand.',
          control: (
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                <input
                  value={deleteText}
                  onChange={(e) => setDeleteText(e.target.value)}
                  placeholder='type "delete"'
                  className={`${fieldInput} w-32`}
                />
                <button
                  type="button"
                  disabled={deleteText.trim().toLowerCase() !== "delete"}
                  onClick={() => {
                    setDeleted(true);
                    setDeleteText("");
                  }}
                  className={`${pillButton} [border-color:rgb(var(--hairline)/0.16)] [color:rgb(var(--text))] disabled:cursor-not-allowed disabled:opacity-30 enabled:hover:[border-color:rgb(var(--text))]`}
                >
                  Delete account
                </button>
              </div>
              {deleted && (
                <span className="text-[11px] [color:rgb(var(--text-mute))]">
                  Stubbed — no backend call was made.
                </span>
              )}
            </div>
          ),
        },
      ],
    },
    {
      title: "Appearance",
      rows: [
        {
          id: "theme",
          title: "Theme",
          description: "Light, dark, or follow your system setting.",
          control: (
            <PillSelect
              options={[
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
                { value: "system", label: "System" },
              ]}
              value={themeValue}
              onChange={(v) => (v === "system" ? setSystemTheme() : setTheme(v as "light" | "dark"))}
            />
          ),
        },
        {
          id: "accent",
          title: "Accent color",
          description: "The one color used for actions, streaks, and the pet's glow.",
          control: (
            <div role="listbox" aria-label="Accent color" className="flex items-center gap-2">
              {CURATED_ACCENTS.map((a) => {
                const selected = settings.accent.toLowerCase() === a.hex.toLowerCase();
                return (
                  <button
                    key={a.hex}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    aria-label={a.label}
                    onClick={() => settings.setAccent(a.hex)}
                    className={`h-7 w-7 shrink-0 rounded-full transition-transform duration-[var(--dur-micro)] active:scale-[0.95] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))] ${
                      selected
                        ? "ring-2 ring-[rgb(var(--accent))] ring-offset-2 ring-offset-[rgb(var(--surface))]"
                        : ""
                    }`}
                    style={{ background: a.hex }}
                  />
                );
              })}
            </div>
          ),
        },
        {
          id: "density",
          title: "Density",
          description: "How tightly rows and cards are packed.",
          control: (
            <PillSelect
              options={[
                { value: "comfortable", label: "Comfortable" },
                { value: "compact", label: "Compact" },
              ]}
              value={settings.density}
              onChange={(v) => settings.setDensity(v as "comfortable" | "compact")}
            />
          ),
        },
        {
          id: "reduce-motion",
          title: "Reduce motion",
          description: "Turn off transitions and animation, independent of your OS setting.",
          control: (
            <Switch
              checked={settings.reduceMotion}
              onChange={settings.setReduceMotion}
              label="Reduce motion"
            />
          ),
        },
      ],
    },
    {
      title: "Habits & streaks",
      rows: [
        {
          id: "week-starts-on",
          title: "Week starts on",
          description: "Sets which day your weekly stats start from.",
          control: (
            <PillSelect
              options={[
                { value: "0", label: "Sunday" },
                { value: "1", label: "Monday" },
              ]}
              value={String(settings.weekStartsOn)}
              onChange={(v) => settings.setWeekStartsOn(Number(v) as 0 | 1)}
            />
          ),
        },
        {
          id: "day-rollover-hour",
          title: "Day rollover hour",
          description: "Night owls: your day ends at 3am, not midnight.",
          control: (
            <select
              value={settings.dayRolloverHour}
              onChange={(e) => settings.setDayRolloverHour(Number(e.target.value))}
              className={`${fieldInput} ${mono}`}
            >
              {ROLLOVER_HOURS.map((h) => (
                <option key={h} value={h}>
                  {h === 0 ? "12:00 AM" : `${h}:00 AM`}
                </option>
              ))}
            </select>
          ),
        },
        {
          id: "streak-freeze",
          title: "Streak freeze",
          description: "Grace days keep your streak alive instead of resetting it to zero.",
          control: (
            <Switch
              checked={settings.streakFreeze}
              onChange={settings.setStreakFreeze}
              label="Streak freeze"
            />
          ),
        },
        {
          id: "vacation-mode",
          title: "Vacation mode",
          description:
            "Streaks hold instead of breaking, from the day you switch it on until the day you switch it off. Days before that are untouched.",
          control: (
            <Switch
              checked={settings.vacationMode}
              onChange={settings.setVacationMode}
              label="Vacation mode"
            />
          ),
        },
      ],
    },
    {
      title: "Notifications",
      rows: [
        {
          id: "notify-push",
          title: "Push notifications",
          description: "Stubbed front-end preference — no delivery is wired up yet.",
          control: (
            <Switch
              checked={settings.notifyPush}
              onChange={settings.setNotifyPush}
              label="Push notifications"
            />
          ),
        },
        {
          id: "notify-email",
          title: "Email notifications",
          description: "Stubbed front-end preference — no delivery is wired up yet.",
          control: (
            <Switch
              checked={settings.notifyEmail}
              onChange={settings.setNotifyEmail}
              label="Email notifications"
            />
          ),
        },
        {
          id: "quiet-hours",
          title: "Quiet hours",
          description: "No notifications will be sent between these times (once delivery exists).",
          control: (
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={settings.quietHoursStart}
                onChange={(e) => settings.setQuietHoursStart(e.target.value)}
                className={`${fieldInput} ${mono}`}
              />
              <span className="[color:rgb(var(--text-mute))]">&ndash;</span>
              <input
                type="time"
                value={settings.quietHoursEnd}
                onChange={(e) => settings.setQuietHoursEnd(e.target.value)}
                className={`${fieldInput} ${mono}`}
              />
            </div>
          ),
        },
        {
          id: "weekly-digest",
          title: "Weekly digest",
          description: "A once-a-week summary of your habits and streaks.",
          control: (
            <Switch
              checked={settings.weeklyDigest}
              onChange={settings.setWeeklyDigest}
              label="Weekly digest"
            />
          ),
        },
      ],
    },
    {
      title: "Quotes",
      rows: [
        {
          id: "quotes-enabled",
          title: "Enable quotes",
          description: "Show a quote of the day on your Today feed.",
          control: (
            <Switch
              checked={settings.quotesEnabled}
              onChange={settings.setQuotesEnabled}
              label="Enable quotes"
            />
          ),
        },
        {
          id: "quote-frequency",
          title: "Frequency",
          description: "How often a new quote appears.",
          control: (
            <PillSelect
              options={[
                { value: "daily", label: "Daily" },
                { value: "off", label: "Off" },
              ]}
              value={settings.quoteFrequency}
              onChange={(v) => settings.setQuoteFrequency(v as "daily" | "off")}
            />
          ),
        },
        {
          id: "quote-traditions",
          title: "Traditions",
          description: "Which sources quotes are drawn from.",
          control: (
            <div className="flex flex-wrap justify-end gap-1.5">
              {TRADITIONS.map((t) => {
                const on = settings.quoteTraditions.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => settings.toggleQuoteTradition(t.id)}
                    className={`${pillButton} ${on ? pillActive : pillInactive}`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          ),
        },
      ],
    },
    {
      title: "Pet",
      rows: [
        {
          id: "pet-name",
          title: "Rename Nix",
          description: "What you call your companion around the app.",
          control: (
            <input
              value={petNameDraft}
              onChange={(e) => setPetNameDraft(e.target.value)}
              onBlur={(e) => settings.setPetName(e.target.value)}
              placeholder="Nix"
              className={`${fieldInput} w-36`}
            />
          ),
        },
        {
          id: "pet-animation",
          title: "Animation",
          description: "Idle bounces and reactions when you feed or check in.",
          control: (
            <Switch
              checked={settings.petAnimation}
              onChange={settings.setPetAnimation}
              label="Pet animation"
            />
          ),
        },
        {
          id: "pet-sprite-mode",
          title: "Sprite mode",
          description: "Swap the pet's rendering for a lower-detail pixel sprite.",
          control: (
            <Switch
              checked={settings.petSpriteMode}
              onChange={settings.setPetSpriteMode}
              label="Sprite mode"
            />
          ),
        },
      ],
    },
    {
      title: "Data",
      rows: [
        {
          id: "export-json",
          title: "Export JSON",
          description: "Download every habit and log as a plain JSON file.",
          control: (
            <button type="button" onClick={exportJson} className={`${pillButton} ${pillInactive}`}>
              Export JSON
            </button>
          ),
        },
        {
          id: "export-csv",
          title: "Export CSV",
          description: "Download your logs as a spreadsheet — one row per check-in.",
          control: (
            <button type="button" onClick={exportCsv} className={`${pillButton} ${pillInactive}`}>
              Export CSV
            </button>
          ),
        },
        {
          id: "import",
          title: "Import",
          description: "Read a Nitor export. Merging it into your data is coming later.",
          control: (
            <div className="flex flex-col items-end gap-1">
              <button
                type="button"
                onClick={handleImportClick}
                className={`${pillButton} ${pillInactive}`}
              >
                Import
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                onChange={handleImportFile}
                className="hidden"
              />
              {importStatus && (
                <span className="max-w-[260px] text-right text-[11px] leading-snug [color:rgb(var(--text-mute))]">
                  {importStatus}
                </span>
              )}
            </div>
          ),
        },
        {
          id: "stored-data",
          title: "Stored data",
          description:
            "Everything lives in this browser — habits, logs, and these preferences. Nothing is sent anywhere.",
          control: (
            <span className={`${mono} text-[12px] [color:rgb(var(--text-mute))]`}>
              {habits.length} habits &middot; {logs.length} logs
            </span>
          ),
        },
      ],
    },
  ];

  const filteredSections = sections.map((s) => ({ title: s.title, rows: filterRows(s.rows, search) }));
  const totalVisible = filteredSections.reduce((n, s) => n + s.rows.length, 0);

  return (
    <AppFrame>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={eyebrow}>Preferences</p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight [color:rgb(var(--text))]">
            Settings
          </h1>
          <p className="mt-1 text-sm [color:rgb(var(--text-mute))]">
            Grouped and searchable. Preferences stay on this device; habits and
            logs sync to your account.
          </p>
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search settings&hellip;"
          aria-label="Search settings"
          className={`${fieldInput} w-full sm:w-64`}
        />
      </header>

      <div className="max-w-[720px] space-y-6">
        {totalVisible === 0 ? (
          <p className="[color:rgb(var(--text-mute))]">No settings match &ldquo;{search}&rdquo;.</p>
        ) : (
          filteredSections.map((s) => <Section key={s.title} title={s.title} rows={s.rows} />)
        )}
      </div>
    </AppFrame>
  );
}
