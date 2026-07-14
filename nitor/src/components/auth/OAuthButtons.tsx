"use client";
import { useRouter } from "next/navigation";

const PROVIDERS = ["Google", "Apple", "GitHub"] as const;

/**
 * Stubbed OAuth — no real provider flow. Clicking any button just routes
 * straight into the app, same as a successful form submit would.
 */
export function OAuthButtons({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  return (
    <div className="flex flex-col gap-2">
      {PROVIDERS.map((provider) => (
        <button
          key={provider}
          type="button"
          onClick={() => router.push(redirectTo)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors duration-[var(--dur-micro)] [border-color:rgb(var(--hairline)/0.12)] [color:rgb(var(--text))] hover:[background:rgb(var(--surface-2))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]"
        >
          Continue with {provider}
        </button>
      ))}
    </div>
  );
}
