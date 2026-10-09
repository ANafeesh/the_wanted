/**
 * Utilities for Sri Lankan phone number validation, normalization, and privacy masking.
 */

/**
 * Normalizes Sri Lankan phone numbers:
 * Accepts: 07XXXXXXXX, +947XXXXXXXX, 947XXXXXXXX (spaces and common delimiters ignored)
 * Returns normalized string: 947XXXXXXXX (exactly 11 digits)
 * Returns null if invalid.
 *
 * @param {string} raw
 * @returns {string|null}
 */
export function normalizePhone(raw) {
  if (!raw || typeof raw !== 'string') return null;

  // Remove whitespace and common formatting characters
  let clean = raw.trim().replace(/[\s\-\(\)\.]/g, '');

  // Strip leading plus if present
  if (clean.startsWith('+')) {
    clean = clean.slice(1);
  }

  // Format 1: 07XXXXXXXX (10 digits)
  if (/^07\d{8}$/.test(clean)) {
    return '947' + clean.slice(2);
  }

  // Format 2: 947XXXXXXXX (11 digits)
  if (/^947\d{8}$/.test(clean)) {
    return clean;
  }

  return null;
}

/**
 * Checks if a phone number is a valid Sri Lankan mobile number.
 * @param {string} raw
 * @returns {boolean}
 */
export function isValidSriLankanPhone(raw) {
  return normalizePhone(raw) !== null;
}

/**
 * Masks a phone number for safe logging to prevent privacy leaks.
 * Example: 94771234567 -> 9477***4567
 *
 * @param {string} phone
 * @returns {string}
 */
export function maskPhone(phone) {
  if (!phone) return '[MASKED_PHONE]';
  const str = String(phone);
  if (str.length < 7) return '***';
  return `${str.slice(0, 4)}***${str.slice(-4)}`;
}
