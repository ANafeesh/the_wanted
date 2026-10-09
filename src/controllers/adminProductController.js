import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import { createProductSchema, updateProductSchema } from '../validators/adminValidator.js';
import { formatProduct } from '../lib/productHelper.js';
import { AppError } from '../lib/errors.js';

/**
 * List all products for admin (including inactive): GET /admin/products
 */
export async function getAdminProducts(req, res, next) {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return res.json(products.map((p) => formatProduct(p)));
  } catch (err) {
    next(err);
  }
}

/**
 * Create a new product: POST /admin/products
 */
export async function createAdminProduct(req, res, next) {
  try {
    const validated = createProductSchema.parse(req.body);

    const id = validated.id?.trim() || `tw-${crypto.randomBytes(4).toString('hex')}`;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (existing) {
      throw new AppError('PRODUCT_ALREADY_EXISTS', `Product with ID "${id}" already exists`, 409);
    }

    const created = await prisma.product.create({
      data: {
        id,
        name: validated.name.trim(),
        category: validated.category.trim(),
        price: validated.price,
        originalPrice: validated.originalPrice !== undefined ? validated.originalPrice : null,
        sizes: JSON.stringify(validated.sizes),
        images: JSON.stringify(validated.images || []),
        description: validated.description?.trim() || null,
        sample: Boolean(validated.sample),
        active: validated.active !== undefined ? Boolean(validated.active) : true
      }
    });

    return res.status(201).json(formatProduct(created));
  } catch (err) {
    next(err);
  }
}

/**
 * Update an existing product: PUT /admin/products/:id
 */
export async function updateAdminProduct(req, res, next) {
  try {
    const { id } = req.params;
    const validated = updateProductSchema.parse(req.body);

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('PRODUCT_NOT_FOUND', `Product "${id}" not found`, 404);
    }

    const updateData = {};
    if (validated.name !== undefined) updateData.name = validated.name.trim();
    if (validated.category !== undefined) updateData.category = validated.category.trim();
    if (validated.price !== undefined) updateData.price = validated.price;
    if (validated.originalPrice !== undefined) updateData.originalPrice = validated.originalPrice;
    if (validated.sizes !== undefined) updateData.sizes = JSON.stringify(validated.sizes);
    if (validated.images !== undefined) updateData.images = JSON.stringify(validated.images);
    if (validated.description !== undefined) updateData.description = validated.description?.trim() || null;
    if (validated.sample !== undefined) updateData.sample = Boolean(validated.sample);
    if (validated.active !== undefined) updateData.active = Boolean(validated.active);

    const updated = await prisma.product.update({
      where: { id },
      data: updateData
    });

    return res.json(formatProduct(updated));
  } catch (err) {
    next(err);
  }
}

/**
 * Soft delete a product: DELETE /admin/products/:id
 * Marks active as false.
 */
export async function deleteAdminProduct(req, res, next) {
  try {
    const { id } = req.params;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('PRODUCT_NOT_FOUND', `Product "${id}" not found`, 404);
    }

    const updated = await prisma.product.update({
      where: { id },
      data: { active: false }
    });

    return res.json({
      message: 'Product deactivated successfully',
      product: formatProduct(updated)
    });
  } catch (err) {
    next(err);
  }
}
