export const startOfUtcDay = (date = new Date()) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

export const formatUtcDay = (date: Date) => date.toISOString().slice(0, 10);
