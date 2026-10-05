/** Canonical form used for storage, lookups and uniqueness checks. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}
