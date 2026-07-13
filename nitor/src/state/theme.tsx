"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";
interface ThemeCtx {
  theme: Theme;
  glass: number; // 0..1 intensity
  setTheme: (t: Theme) => void;
  setGlass: (g: number) => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [glass, setGlass] = useState<number>(1);

  useEffect(() => {
    const savedTheme = localStorage.getItem("nitor.theme") as Theme | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(savedTheme ?? (prefersDark ? "dark" : "light"));
    const savedGlass = localStorage.getItem("nitor.glass");
    if (savedGlass) setGlass(Number(savedGlass));
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("nitor.theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.setProperty("--glass-tint-opacity", String(0.3 + glass * 0.3));
    localStorage.setItem("nitor.glass", String(glass));
  }, [glass]);

  return <Ctx.Provider value={{ theme, glass, setTheme, setGlass }}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useTheme must be used within ThemeProvider");
  return c;
}
