import type { ReactNode } from "react";
import { Sidebar } from "@/components/nav/Sidebar";
import { TabBar } from "@/components/nav/TabBar";
import { CommandPalette } from "@/components/app/CommandPalette";
import { today } from "@/domain/dates";

interface AppFrameProps {
  children: ReactNode;
  /** Day progress, 0-100. Drives the top-bar hairline fill. */
  progress?: number;
}

/**
 * Shared desktop-first shell: fixed flat Sidebar on md+, flat TabBar below
 * md, main content offset to the right of the sidebar on desktop. Renders
 * a slim top bar (date, day-progress hairline, pet mood chip) and mounts
 * the global command palette once.
 */
export function AppFrame({ children, progress = 0 }: AppFrameProps) {
  const pct = Math.min(100, Math.max(0, progress));

  return (
    <>
      <Sidebar />
      <TabBar />
      <CommandPalette />
      <main className="md:pl-60">
        <div className="mx-auto w-full max-w-[1200px] px-6 md:px-10 py-8 pb-28 md:pb-10">
          <div className="mb-4 flex items-center justify-between gap-4">
            <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.08em] [color:rgb(var(--text-mute))]">
              {today()}
            </p>
            <div className="flex items-center gap-2 rounded-full border px-3 py-1 [border-color:rgb(var(--hairline)/0.08)]">
              <span
                className="h-1.5 w-1.5 rounded-full [background:rgb(var(--accent))]"
                aria-hidden="true"
              />
              <span className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.06em] [color:rgb(var(--text-dim))]">
                Nix &middot; content
              </span>
            </div>
          </div>

          <div className="mb-8 h-px w-full [background:rgb(var(--hairline)/0.08)]">
            <div
              className="h-px [background:rgb(var(--accent))] transition-[width] duration-[var(--dur)] [transition-timing-function:var(--ease)]"
              style={{ width: `${pct}%` }}
            />
          </div>

          {children}
        </div>
      </main>
    </>
  );
}
