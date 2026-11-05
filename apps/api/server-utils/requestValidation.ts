import mongoose from 'mongoose';

export const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/gif',
];

export const ALLOWED_SECTION_TYPES = ['experience', 'education', 'project'];

export const MAX_TEXT_LENGTH = 10000; // Maximum characters for text inputs
export const MAX_CV_IMPORT_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_BASE64_LENGTH = Math.ceil(MAX_CV_IMPORT_FILE_BYTES / 3) * 4;

export function sanitizeTextForPrompt(text: string): string {
    // Strip control characters and limit length
    return text
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        .slice(0, MAX_TEXT_LENGTH)
        .trim();
}

export function sanitizeContextField(value: any): string {
    if (typeof value !== 'string') return 'Unknown';
    return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').slice(0, 200).trim() || 'Unknown';
}

export const isMongoDuplicateKeyError = (error: any) => (
    error?.code === 11000 || error?.name === 'MongoServerError' && error?.code === 11000
);

export const isMongoValidationError = (error: any) => error?.name === 'ValidationError';

export const isValidDocumentId = (id: unknown) => (
    typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)
);

export const sanitizeContactMessage = (value: unknown) => (
    typeof value === 'string'
        ? value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim().slice(0, 3000)
        : ''
);

export const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
