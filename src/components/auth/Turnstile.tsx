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
  /**
   * Fired when the script fails to load (ad blocker, corporate network) or
   * the widget reports an unrecoverable error. Consumers MUST surface this
   * to the user — e.g. "Verification could not load — disable your ad
   * blocker or try another network" — because a null token alone cannot
   * distinguish "not solved yet" from "cannot ever be solved".
   */
  onError?: () => void;
}

/**
 * Cloudflare Turnstile widget wrapper. Loads the widget script lazily and
 * renders it explicitly into `holder`. With no site key configured it
 * renders an empty div and does nothing — the secret always lives in the
 * Supabase dashboard, never in this app.
 */
export const Turnstile = forwardRef<TurnstileHandle, TurnstileProps>(
  function Turnstile({ onToken, onError }, ref) {
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
          "error-callback": () => {
            onToken(null);
            onError?.();
          },
          "expired-callback": () => onToken(null),
        });
      }

      // Cloudflare tracks widgets in its own registry, not the DOM. The auth
      // pages are separate routes, so client-side navigation between them
      // mounts and unmounts this component repeatedly — without remove(),
      // every cycle strands a widget pointing at a detached node for the life
      // of the SPA session. Guarded: nothing to do if the script never loaded
      // or a widget was never rendered.
      function removeWidget() {
        if (widgetId.current && window.turnstile) {
          window.turnstile.remove(widgetId.current);
        }
        widgetId.current = null;
      }

      // A blocked script (ad blocker, corporate network) would otherwise be
      // indistinguishable from the deliberate no-site-key no-op: an empty div
      // and a form that rejects every submit — a permanent, silent lockout.
      function handleScriptError() {
        onToken(null);
        onError?.();
      }

      if (window.turnstile) {
        render();
        return removeWidget;
      }

      const existing = document.querySelector<HTMLScriptElement>(
        `script[src="${SCRIPT_SRC}"]`,
      );
      const script = existing ?? document.createElement("script");
      if (!existing) {
        script.src = SCRIPT_SRC;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
      script.addEventListener("load", render);
      script.addEventListener("error", handleScriptError);

      return () => {
        script.removeEventListener("load", render);
        script.removeEventListener("error", handleScriptError);
        removeWidget();
      };
    }, [onToken, onError]);

    return <div ref={holder} className="flex justify-center" />;
  },
);
