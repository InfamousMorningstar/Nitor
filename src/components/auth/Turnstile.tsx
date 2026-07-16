"use client";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

interface TurnstileOptions {
  sitekey: string;
  callback: (token: string) => void;
  "error-callback"?: () => void;
  "expired-callback"?: () => void;
  theme?: "auto" | "light" | "dark";
}

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: TurnstileOptions) => string;
      reset: (id: string) => void;
      remove: (id: string) => void;
    };
  }
}

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export interface TurnstileHandle {
  /** Turnstile tokens are single-use — reset after every failed submit. */
  reset: () => void;
}

interface TurnstileProps {
  onToken: (token: string | null) => void;
}

/**
 * Cloudflare Turnstile widget wrapper. Loads the widget script lazily and
 * renders it explicitly into `holder`. With no site key configured it
 * renders an empty div and does nothing — the secret always lives in the
 * Supabase dashboard, never in this app.
 */
export const Turnstile = forwardRef<TurnstileHandle, TurnstileProps>(
  function Turnstile({ onToken }, ref) {
    const holder = useRef<HTMLDivElement>(null);
    const widgetId = useRef<string | null>(null);

    useImperativeHandle(ref, () => ({
      reset() {
        if (widgetId.current && window.turnstile) {
          window.turnstile.reset(widgetId.current);
          onToken(null);
        }
      },
    }));

    useEffect(() => {
      const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
      if (!sitekey || !holder.current) return;

      function render() {
        if (!holder.current || !window.turnstile || widgetId.current) return;
        widgetId.current = window.turnstile.render(holder.current, {
          sitekey: sitekey!,
          theme: "auto",
          callback: (token) => onToken(token),
          "error-callback": () => onToken(null),
          "expired-callback": () => onToken(null),
        });
      }

      if (window.turnstile) {
        render();
        return;
      }

      const existing = document.querySelector<HTMLScriptElement>(
        `script[src="${SCRIPT_SRC}"]`,
      );
      if (existing) {
        existing.addEventListener("load", render);
        return () => existing.removeEventListener("load", render);
      }

      const script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.addEventListener("load", render);
      document.head.appendChild(script);

      return () => script.removeEventListener("load", render);
    }, [onToken]);

    return <div ref={holder} className="flex justify-center" />;
  },
);
