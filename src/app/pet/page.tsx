import { AppFrame } from "@/components/app/AppFrame";

const eyebrow =
  "font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.08em] [color:rgb(var(--text-mute))]";

export default function PetPage() {
  return (
    <AppFrame>
      <header className="mb-6">
        <p className={eyebrow}>Companion</p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight [color:rgb(var(--text))]">
          Pet
        </h1>
      </header>

      <section className="max-w-[720px] rounded-2xl border p-6 sm:p-8 [border-color:rgb(var(--hairline)/0.08)] [background:rgb(var(--surface))]">
        <p className={eyebrow}>Coming soon</p>
        <h2 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight [color:rgb(var(--text))]">
          Nix is taking shape.
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-relaxed [color:rgb(var(--text-dim))]">
          Nix will return in a future phase as a quiet companion that celebrates
          showing up without guilt, pressure, or penalties.
        </p>
      </section>
    </AppFrame>
  );
}
