"use client";
import { useEffect, useState } from "react";

export interface TierInputs {
  reducedMotion: boolean;
  chromiumSvgBackdrop: boolean;
}

export function detectGlassTier(i: TierInputs): 1 | 2 | 3 {
  if (i.reducedMotion) return 3;
  if (i.chromiumSvgBackdrop) return 1;
  return 2;
}

function supportsSvgBackdrop(): boolean {
  // Chromium supports url() SVG filters in backdrop-filter; Safari/Firefox do not.
  const ua = navigator.userAgent;
  const isChromium = /Chrome|Chromium|Edg/.test(ua) && !/OPR|SamsungBrowser/.test(ua);
  const supported =
    CSS.supports("backdrop-filter", "url(#x)") ||
    CSS.supports("-webkit-backdrop-filter", "url(#x)");
  return isChromium && supported;
}

export function useGlassTier(): 1 | 2 | 3 {
  const [tier, setTier] = useState<1 | 2 | 3>(2); // SSR-safe default
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTier(detectGlassTier({ reducedMotion: reduced, chromiumSvgBackdrop: supportsSvgBackdrop() }));
  }, []);
  return tier;
}
