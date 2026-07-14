import { eyebrow, passwordStrength } from "./formKit";

/**
 * Thin accent-filled segmented bar — the ONLY strength signal. No
 * color-coded shaming copy ("weak"/"strong" in red/green); the bar itself
 * (0..4 segments lit) is the whole message.
 */
export function PasswordStrengthBar({ password }: { password: string }) {
  const score = passwordStrength(password);
  return (
    <div className="mt-2">
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full [background:rgb(var(--hairline)/0.12)]"
          >
            <div
              className="h-full rounded-full transition-[width] duration-[var(--dur)] [transition-timing-function:var(--ease)] [background:rgb(var(--accent))]"
              style={{ width: i < score ? "100%" : "0%" }}
            />
          </div>
        ))}
      </div>
      <p className={`${eyebrow} mt-1.5`}>Password strength</p>
    </div>
  );
}
