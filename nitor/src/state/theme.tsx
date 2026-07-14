"use client";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

type Theme = "light" | "dark";
interface ThemeCtx {
  theme: Theme;
  glass: number; // 0..1 intensity
  /** true when the theme is currently following the OS preference (no explicit choice stored) */
  followsSystem: boolean;
  setTheme: (t: Theme) => void;
  setGlass: (g: number) => void;
  /** Clears the stored theme choice and re-derives from the OS preference. */
  setSystemTheme: () => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [glass, setGlass] = useState<number>(1);
  const [followsSystem, setFollowsSystem] = useState(false);
  // Mirrors followsSystem for use inside the persist effect without adding it as a dep.
  const followsSystemRef = useRef(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("nitor.theme") as Theme | null;
    followsSystemRef.current = !savedTheme;
    setFollowsSystem(!savedTheme);
    setThemeState(savedTheme ?? (systemPrefersDark() ? "dark" : "light"));
    const savedGlass = localStorage.getItem("nitor.glass");
    if (savedGlass) setGlass(Number(savedGlass));
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    if (followsSystemRef.current) {
      localStorage.removeItem("nitor.theme");
    } else {
      localStorage.setItem("nitor.theme", theme);
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.setProperty("--glass-tint-opacity", String(0.3 + glass * 0.3));
    localStorage.setItem("nitor.glass", String(glass));
  }, [glass]);

  function setTheme(t: Theme) {
    followsSystemRef.current = false;
    setFollowsSystem(false);
    setThemeState(t);
  }

  function setSystemTheme() {
    followsSystemRef.current = true;
    setFollowsSystem(true);
    setThemeState(systemPrefersDark() ? "dark" : "light");
  }

  return (
    <Ctx.Provider value={{ theme, glass, followsSystem, setTheme, setGlass, setSystemTheme }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTheme(): ThemeCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useTheme must be used within ThemeProvider");
  return c;
}
