"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { NAV_ITEMS } from "@/components/nav/navItems";
import { useDialogFocus } from "@/components/a11y/useDialogFocus";

interface PaletteAction {
  id: string;
  label: string;
  href: string;
}

/**
 * Global ⌘K / Ctrl+K command palette. Flat matte modal — no blur, a dim
 * scrim behind it. Mounted once, from AppFrame.
 */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const actions: PaletteAction[] = useMemo(() => {
    const navActions = NAV_ITEMS.map((item) => ({
      id: `nav-${item.href}`,
      label: `Go to ${item.label}`,
      href: item.href,
    }));
    return [
      ...navActions,
      { id: "add-habit", label: "Add a habit", href: "/habits" },
      { id: "log-habit", label: "Log a habit", href: "/today" },
    ];
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter((a) => a.label.toLowerCase().includes(q));
  }, [actions, query]);

  // Global toggle shortcut.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((wasOpen) => {
          if (!wasOpen) {
            setQuery("");
            setActiveIndex(0);
          }
          return !wasOpen;
        });
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function close() {
    setOpen(false);
  }

  useDialogFocus({
    open,
    onClose: close,
    containerRef,
    initialFocusRef: inputRef,
  });

  function run(action: PaletteAction) {
    router.push(action.href);
    close();
  }

  function onKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const action = filtered[activeIndex];
      if (action) run(action);
      return;
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[15vh]" onKeyDown={onKeyDown}>
      <div
        className="fixed inset-0 [background:rgb(0_0_0/0.5)]"
        onClick={close}
        aria-hidden="true"
      />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl border [border-color:rgb(var(--hairline)/0.08)] [background:rgb(var(--surface))] shadow-[0_1px_2px_rgba(0,0,0,0.4)]"
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
          }}
          placeholder="Type a command…"
          aria-label="Search commands"
          className="w-full border-b bg-transparent px-4 py-3 text-sm outline-none [border-color:rgb(var(--hairline)/0.08)] [color:rgb(var(--text))] placeholder:[color:rgb(var(--text-mute))]"
        />
        <ul className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 && (
            <li className="px-4 py-3 text-sm [color:rgb(var(--text-mute))]">No matches</li>
          )}
          {filtered.map((action, i) => (
            <li key={action.id}>
              <button
                type="button"
                onClick={() => run(action)}
                onMouseEnter={() => setActiveIndex(i)}
                onFocus={() => setActiveIndex(i)}
                className={
                  "flex w-full items-center px-4 py-2.5 text-left text-sm transition-colors duration-[var(--dur-micro)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[rgb(var(--accent))] " +
                  (i === activeIndex
                    ? "[background:rgb(var(--surface-2))] [color:rgb(var(--accent))]"
                    : "[color:rgb(var(--text-dim))]")
                }
              >
                {action.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
