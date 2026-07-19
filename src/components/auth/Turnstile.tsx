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

    // Latest-ref pattern. Consumers naturally pass inline arrows, whose
    // identity changes on every parent render — every keystroke in an auth
    // form. If the widget lifecycle depended on that identity, each keystroke
    // would tear down and rebuild the CAPTCHA and discard any solved token,
    // making submission impossible. The refs keep callbacks fresh while the
    // effect below runs once per mount.
    const onTokenRef = useRef(onToken);
    const onErrorRef = useRef(onError);
    useEffect(() => {
      onTokenRef.current = onToken;
      onErrorRef.current = onError;
    });

    useImperativeHandle(ref, () => ({
      reset() {
        if (widgetId.current && window.turnstile) {
          window.turnstile.reset(widgetId.current);
          onTokenRef.current(null);
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
          callback: (token) => onTokenRef.current(token),
          "error-callback": () => {
            onTokenRef.current(null);
            onErrorRef.current?.();
          },
          "expired-callback": () => onTokenRef.current(null),
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
        onTokenRef.current(null);
        onErrorRef.current?.();
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
      // The site key is fixed for the app's lifetime and callbacks go through
      // refs — mount/unmount is the only thing that should drive this effect.
    }, []);

    return <div ref={holder} className="flex justify-center" />;
  },
);
