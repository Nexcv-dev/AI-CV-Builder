const allowedAuthEmailDomains = new Set([
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
]);

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

const getAuthEmailDomainError = (email: string) => {
    const domain = email.split('@')[1]?.toLowerCase() || '';
    if (!domain) return 'Enter a valid email address.';
    if (blockedAuthEmailDomains.has(domain)) return 'Enter a valid email address.';
    if (!allowedAuthEmailDomains.has(domain)) {
        return 'Enter a valid email address.';
    }
    return '';
};

export const validateAuthEmail = (email: string, isValidEmail: (value: string) => boolean) => {
    if (!isValidEmail(email)) return 'Enter a valid email address.';
    return getAuthEmailDomainError(email);
};
