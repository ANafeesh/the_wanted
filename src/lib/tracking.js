/**
 * Builds the tracking URL from TRACKING_URL_TEMPLATE environment variable.
 * Only returns a URL when both template and tracking number are available; otherwise null.
 *
 * @param {string|null} trackingNumber
 * @returns {string|null}
 */
export function buildTrackingUrl(trackingNumber) {
  const template = process.env.TRACKING_URL_TEMPLATE;
  if (!template || !trackingNumber) {
    return null;
  }

  // Replace {trackingNumber} placeholder safely
  return template.replace('{trackingNumber}', encodeURIComponent(trackingNumber.trim()));
}
