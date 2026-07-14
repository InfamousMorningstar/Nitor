/**
 * Inline per-field validation message — never a summary wall at the top of
 * the form. Reserves layout space only once an error exists.
 */
export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1.5 text-xs [color:rgb(var(--accent))]">
      {message}
    </p>
  );
}
