const allowedAuthEmailDomains = [
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'proton.me',
  'protonmail.com',
  'aol.com',
];

const blockedAuthEmailDomains = new Set([
  'mailinator.com',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.org',
  'yopmail.com',
  'tempmail.com',
  'temp-mail.org',
  '10minutemail.com',
  'throwawaymail.com',
  'trashmail.com',
  'sharklasers.com',
  'getairmail.com',
]);

const commonDomainTypos: Record<string, string> = {
  'gmai.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.cm': 'gmail.com',
  'gmail.om': 'gmail.com',
  'gmail.comm': 'gmail.com',
  'yaho.com': 'yahoo.com',
  'yahoo.con': 'yahoo.com',
  'yahoo.co': 'yahoo.com',
  'yhoo.com': 'yahoo.com',
  'hotmial.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'hotmail.con': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'outlook.con': 'outlook.com',
  'iclod.com': 'icloud.com',
  'icloud.con': 'icloud.com',
  'protonmail.con': 'protonmail.com',
};

const levenshteinDistance = (left: string, right: string) => {
  const rows = Array.from({ length: left.length + 1 }, (_, index) => [index]);
  for (let index = 1; index <= right.length; index += 1) rows[0][index] = index;

  for (let row = 1; row <= left.length; row += 1) {
    for (let col = 1; col <= right.length; col += 1) {
      const cost = left[row - 1] === right[col - 1] ? 0 : 1;
      rows[row][col] = Math.min(
        rows[row - 1][col] + 1,
        rows[row][col - 1] + 1,
        rows[row - 1][col - 1] + cost
      );
    }
  }

  return rows[left.length][right.length];
};

const getEmailParts = (value: string) => {
  const trimmed = value.trim().toLowerCase();
  const [localPart, domain, ...rest] = trimmed.split('@');
  if (!localPart || !domain || rest.length) return null;
  return { localPart, domain, email: `${localPart}@${domain}` };
};

export const getSuggestedEmail = (value: string) => {
  const parts = getEmailParts(value);
  if (!parts) return '';

  const directSuggestion = commonDomainTypos[parts.domain];
  if (directSuggestion) return `${parts.localPart}@${directSuggestion}`;

  const nearest = allowedAuthEmailDomains
    .map((domain) => ({ domain, distance: levenshteinDistance(parts.domain, domain) }))
    .filter(({ distance }) => distance > 0 && distance <= 2)
    .sort((a, b) => a.distance - b.distance)[0];

  return nearest ? `${parts.localPart}@${nearest.domain}` : '';
};

export const getAuthEmailError = (value: string) => {
  const parts = getEmailParts(value);
  if (!parts) return 'Enter a valid email address.';
  if (blockedAuthEmailDomains.has(parts.domain)) return 'Enter a valid email address.';
  if (!allowedAuthEmailDomains.includes(parts.domain)) {
    return 'Enter a valid email address.';
  }
  return '';
};

const passwordPolicyMessage = 'Use 8+ characters with uppercase, lowercase, number, and symbol.';

export const getPasswordError = (value: string) => {
  if (
    value.length >= 8 &&
    /[a-z]/.test(value) &&
    /[A-Z]/.test(value) &&
    /\d/.test(value) &&
    /[^A-Za-z0-9]/.test(value)
  ) {
    return '';
  }
  return passwordPolicyMessage;
};

export const getPasswordChecks = (value: string) => [
  { label: '8+ characters', passed: value.length >= 8 },
  { label: 'Uppercase', passed: /[A-Z]/.test(value) },
  { label: 'Lowercase', passed: /[a-z]/.test(value) },
  { label: 'Number', passed: /\d/.test(value) },
  { label: 'Symbol', passed: /[^A-Za-z0-9]/.test(value) },
];
