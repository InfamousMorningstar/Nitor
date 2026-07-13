import { AppFrame } from "@/components/app/AppFrame";

export default function PetPage() {
  return (
    <AppFrame>
      <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight">
        Pet
      </h1>
      <p className="mt-2 font-[family-name:var(--font-mono)] text-sm [color:rgb(var(--text-mute))]">
        Coming together&hellip;
      </p>
    </AppFrame>
  );
}
