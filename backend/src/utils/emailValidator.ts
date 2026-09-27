/**
 * Helper to validate whether an email address belongs to an authorized college domain.
 * Domain list is driven by COLLEGE_EMAIL_DOMAINS env var (comma-separated).
 * Defaults to 'tsecmumbai.in' if no env var is specified.
 */
export function getAllowedCollegeDomains(): string[] {
  const envVal = process.env.COLLEGE_EMAIL_DOMAINS || process.env.COLLEGE_EMAIL_DOMAIN;
  if (envVal) {
    return envVal
      .split(',')
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean);
  }
  return ['tsecmumbai.in', '.edu'];
}

/**
 * Checks if a given email address belongs to one of the authorized college domains.
 * Extract actual domain portion after '@'.
 * Handles exact matches (e.g., 'tsecmumbai.in'), subdomains (e.g., 'student.tsecmumbai.in'),
 * and wildcard suffix entries (e.g., '.edu').
 */
export function isAllowedCollegeEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const normalized = email.trim().toLowerCase();
  const parts = normalized.split('@');
  if (parts.length !== 2) return false;

  const domain = parts[1];
  if (!domain) return false;

  const allowedEntries = getAllowedCollegeDomains();

  return allowedEntries.some((entry) => {
    const cleanEntry = entry.toLowerCase();
    if (cleanEntry.startsWith('.')) {
      return domain.endsWith(cleanEntry);
    }
    return domain === cleanEntry || domain.endsWith('.' + cleanEntry);
  });
}

/**
 * Verifies that a Google token payload:
 * 1. Has email_verified === true (or 'true')
 * 2. Has an email address belonging to an allowed college domain
 */
export function isVerifiedCollegeGoogleAccount(payload: {
  email?: string;
  email_verified?: boolean | string;
}): { allowed: boolean; reason?: string } {
  if (!payload || !payload.email) {
    return { allowed: false, reason: 'Google token payload is missing an email address.' };
  }

  const isVerified = payload.email_verified === true || payload.email_verified === 'true';
  if (!isVerified) {
    return { allowed: false, reason: 'Only verified college email addresses are allowed.' };
  }

  if (!isAllowedCollegeEmail(payload.email)) {
    return { allowed: false, reason: 'Only verified college email addresses are allowed.' };
  }

  return { allowed: true };
}
