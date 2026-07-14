"use client";
import { type ElementType, type ReactNode, type CSSProperties } from "react";
import { useGlassTier } from "./useGlassTier";

interface GlassProps {
  as?: ElementType;
  className?: string;
  interactive?: boolean;
  children?: ReactNode;
}

export function Glass({ as, className = "", interactive = false, children }: GlassProps) {
  const Tag = (as ?? "div") as ElementType;
  const tier = useGlassTier();

  const base =
    "relative rounded-3xl border overflow-hidden " +
    "[border-color:rgb(var(--hairline)/0.10)] " +
    "[background:rgb(var(--glass-tint)/var(--glass-tint-opacity))] " +
    (interactive ? "transition-transform duration-300 will-change-transform active:scale-[0.98] " : "");

  const tierStyle: Record<1 | 2 | 3, CSSProperties> = {
    1: {
      backdropFilter: "url(#nitor-liquid) blur(var(--glass-blur)) saturate(var(--glass-saturate))",
      WebkitBackdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
    },
    2: {
      backdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
      WebkitBackdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
    },
    3: {
      backdropFilter: "blur(8px)",
      WebkitBackdropFilter: "blur(8px)",
    },
  };

  return (
    <Tag className={`${base} ${className}`} style={tierStyle[tier]} data-glass-tier={tier}>
      {/* specular highlight */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{
          background:
            "linear-gradient(135deg, rgb(255 255 255 / var(--glass-specular-opacity)) 0%, transparent 40%, transparent 60%, rgb(255 255 255 / calc(var(--glass-specular-opacity) * 0.5)) 100%)",
        }}
      />
      <div className="relative">{children}</div>
    </Tag>
  );
}
