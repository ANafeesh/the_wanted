/**
 * Converts a database Product record to the contract-specified Product object.
 *
 * @param {Object} p Database product record
 * @returns {Object} API-formatted Product object
 */
export function formatProduct(p) {
  if (!p) return null;

  let parsedSizes = [];
  try {
    parsedSizes = typeof p.sizes === 'string' ? JSON.parse(p.sizes) : (p.sizes || []);
  } catch {
    parsedSizes = [];
  }

  let parsedImages = [];
  try {
    parsedImages = typeof p.images === 'string' ? JSON.parse(p.images) : (p.images || []);
  } catch {
    parsedImages = [];
  }

  const out = {
    id: p.id,
    name: p.name,
    category: p.category,
    price: Number(p.price),
    sizes: Array.isArray(parsedSizes) ? parsedSizes : [],
    images: Array.isArray(parsedImages) ? parsedImages : [],
    active: Boolean(p.active)
  };

  if (p.originalPrice !== null && p.originalPrice !== undefined) {
    out.originalPrice = Number(p.originalPrice);
  }

  if (p.description !== null && p.description !== undefined) {
    out.description = p.description;
  }

  if (p.sample !== null && p.sample !== undefined) {
    out.sample = Boolean(p.sample);
  }

  return out;
}
