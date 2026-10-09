import { prisma } from '../lib/prisma.js';
import { formatProduct } from '../lib/productHelper.js';
import { AppError } from '../lib/errors.js';

/**
 * Public handler for GET /products
 * Returns active products only.
 */
export async function getProducts(req, res, next) {
  try {
    const products = await prisma.product.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' }
    });

    const formatted = products.map((p) => formatProduct(p));
    return res.json(formatted);
  } catch (err) {
    next(err);
  }
}

/**
 * Public handler for GET /products/:id
 * Returns active product by ID, or 404 if not found or inactive.
 */
export async function getProductById(req, res, next) {
  try {
    const { id } = req.params;
    const product = await prisma.product.findFirst({
      where: { id, active: true }
    });

    if (!product) {
      throw new AppError('PRODUCT_NOT_FOUND', `Product not found: ${id}`, 404);
    }

    return res.json(formatProduct(product));
  } catch (err) {
    next(err);
  }
}
