// Mirrors the server's StrongPasswordSchema (backend/src/validation/user.schema.ts) so users see the rule before submitting.
export const PASSWORD_RULES = 'At least 12 characters, with an uppercase letter, a lowercase letter and a number.';

export function passwordProblem(pw: string): string | null {
  if (pw.length < 12) return `Use at least 12 characters (${pw.length} so far).`;
  if (!/[A-Z]/.test(pw)) return 'Add an uppercase letter.';
  if (!/[a-z]/.test(pw)) return 'Add a lowercase letter.';
  if (!/[0-9]/.test(pw)) return 'Add a number.';
  return null;
}

// Server validation errors are developer-facing ("Request validation failed"); show the rule instead.
export const passwordSaveError = (err: { code?: string; message?: string }) =>
  err?.code === 'VALIDATION_ERROR'
    ? `That password can't be used. ${PASSWORD_RULES}`
    : err?.message || "Couldn't save the password. Please try again.";
