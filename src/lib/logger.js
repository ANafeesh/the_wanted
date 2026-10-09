import { maskPhone } from './phone.js';

/**
 * Sanitizes object keys and sensitive values (passwords, tokens, phone numbers).
 * @param {any} data
 * @returns {any}
 */
export function sanitizeLogData(data) {
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') {
    if (typeof data === 'string') {
      // Look for phone patterns
      if (/(\+?947\d{8}|07\d{8})/.test(data)) {
        return data.replace(/(\+?947\d{8}|07\d{8})/g, (match) => maskPhone(match));
      }
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeLogData(item));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes('password') ||
      lowerKey.includes('token') ||
      lowerKey.includes('secret') ||
      lowerKey.includes('authorization') ||
      lowerKey.includes('cookie')
    ) {
      sanitized[key] = '[REDACTED]';
    } else if (lowerKey.includes('phone')) {
      sanitized[key] = maskPhone(value);
    } else {
      sanitized[key] = sanitizeLogData(value);
    }
  }

  return sanitized;
}

export const logger = {
  info: (msg, meta) => {
    if (process.env.NODE_ENV !== 'test') {
      if (meta) console.log(`[INFO] ${msg}`, sanitizeLogData(meta));
      else console.log(`[INFO] ${msg}`);
    }
  },
  warn: (msg, meta) => {
    if (process.env.NODE_ENV !== 'test') {
      if (meta) console.warn(`[WARN] ${msg}`, sanitizeLogData(meta));
      else console.warn(`[WARN] ${msg}`);
    }
  },
  error: (msg, meta) => {
    if (meta) console.error(`[ERROR] ${msg}`, sanitizeLogData(meta));
    else console.error(`[ERROR] ${msg}`);
  }
};
