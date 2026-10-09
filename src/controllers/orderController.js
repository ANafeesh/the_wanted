import { prisma } from '../lib/prisma.js';
import { createOrderSchema } from '../validators/orderValidator.js';
import { normalizePhone } from '../lib/phone.js';
import { buildTrackingUrl } from '../lib/tracking.js';
import { getStoreSettings } from './configController.js';
import { notifyNewOrder } from '../lib/notify.js';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

/**
 * Generate a random 6-digit reference prefixed with "TW-" (e.g. TW-784291).
 */
function generateOrderReference() {
  const digits = Math.floor(100000 + Math.random() * 900000);
  return `TW-${digits}`;
}

/**
 * Public handler for POST /orders
 */
export async function createOrder(req, res, next) {
  try {
    // 1. Zod input validation
    const validated = createOrderSchema.parse(req.body);

    // 2. Normalize customer phone
    const normalizedPhone = normalizePhone(validated.customer.phone);
    if (!normalizedPhone) {
      throw new AppError('INVALID_PHONE', 'Invalid Sri Lankan phone number format', 400);
    }

    // 3. Fetch store settings and check payment method enablement
    const settings = await getStoreSettings();
    const enabledMethods = settings.enabledPaymentMethods[validated.fulfillment] || [];
    if (!enabledMethods.includes(validated.paymentMethod)) {
      throw new AppError(
        'PAYMENT_METHOD_UNAVAILABLE',
        `Payment method "${validated.paymentMethod}" is currently not available for ${validated.fulfillment} delivery`,
        400
      );
    }

    // 4. Load products from database, verify active status and sizes, and extract server-side unit prices
    const lineItemsToCreate = [];
    let subtotal = 0;

    for (const item of validated.items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId }
      });

      if (!product || !product.active) {
        throw new AppError('PRODUCT_NOT_FOUND', `Product "${item.productId}" is not available`, 400);
      }

      let availableSizes = [];
      try {
        availableSizes = typeof product.sizes === 'string' ? JSON.parse(product.sizes) : product.sizes;
      } catch {
        availableSizes = [];
      }

      if (!Array.isArray(availableSizes) || !availableSizes.includes(item.size)) {
        throw new AppError(
          'INVALID_SIZE',
          `Size "${item.size}" is not available for product "${product.name}"`,
          400
        );
      }

      const unitPrice = Number(product.price);
      const lineSubtotal = unitPrice * item.quantity;
      subtotal += lineSubtotal;

      lineItemsToCreate.push({
        productId: product.id,
        name: product.name,
        size: item.size,
        quantity: item.quantity,
        unitPrice
      });
    }

    // 5. Compute shipping fee and grand total
    let shippingFee = 0;
    if (validated.fulfillment === 'post') {
      const threshold = settings.freeShippingThreshold;
      if (typeof threshold === 'number' && subtotal >= threshold) {
        shippingFee = 0;
      } else {
        shippingFee = typeof settings.shippingFee === 'number' ? settings.shippingFee : 0;
      }
    }
    const total = subtotal + shippingFee;

    // 6. Address fields (pickup must not store address)
    const customerAddress = validated.fulfillment === 'post' ? validated.customer.address?.trim() : null;
    const customerCity = validated.fulfillment === 'post' ? validated.customer.city?.trim() : null;
    const customerPostalCode = validated.fulfillment === 'post' ? validated.customer.postalCode?.trim() : null;
    const customerDistrict = validated.fulfillment === 'post' ? validated.customer.district?.trim() : null;

    const bankTransferInstructions =
      validated.paymentMethod === 'bank_transfer' ? (settings.bankTransferInstructions || '') : '';

    // 7. Create order and line items in a single transaction with collision retry
    let createdOrder = null;
    let attempts = 0;
    const maxAttempts = 10;

    while (!createdOrder && attempts < maxAttempts) {
      attempts++;
      const reference = generateOrderReference();

      try {
        createdOrder = await prisma.$transaction(async (tx) => {
          const order = await tx.order.create({
            data: {
              reference,
              fulfillment: validated.fulfillment,
              status: 'pending',
              paymentStatus: 'unpaid',
              paymentMethod: validated.paymentMethod,
              customerName: validated.customer.name.trim(),
              customerPhone: normalizedPhone,
              customerAddress,
              customerCity,
              customerPostalCode,
              customerDistrict,
              notes: validated.notes?.trim() || null,
              subtotal,
              shippingFee,
              total,
              bankTransferInstructions,
              items: {
                create: lineItemsToCreate.map((line) => ({
                  productId: line.productId,
                  name: line.name,
                  size: line.size,
                  quantity: line.quantity,
                  unitPrice: line.unitPrice
                }))
              }
            },
            include: {
              items: true
            }
          });
          return order;
        });
      } catch (err) {
        // If unique constraint violation on reference, retry with new reference
        if (err.code === 'P2002' && attempts < maxAttempts) {
          continue;
        }
        throw err;
      }
    }

    if (!createdOrder) {
      throw new AppError('ORDER_CREATION_FAILED', 'Failed to generate unique order reference', 500);
    }

    // 8. Call notifyNewOrder placeholder safely (failure must never fail the order)
    try {
      await notifyNewOrder(createdOrder);
    } catch (notifyErr) {
      logger.error('Failed to send new order notification', { error: notifyErr.message });
    }

    // 9. Respond with 201 Created and contract-specified payload
    return res.status(201).json({
      reference: createdOrder.reference,
      fulfillment: createdOrder.fulfillment,
      status: createdOrder.status,
      paymentStatus: createdOrder.paymentStatus,
      subtotal: createdOrder.subtotal,
      shippingFee: createdOrder.shippingFee,
      total: createdOrder.total,
      items: createdOrder.items.map((line) => ({
        productId: line.productId,
        name: line.name,
        size: line.size,
        quantity: line.quantity,
        unitPrice: line.unitPrice
      })),
      paymentMethod: createdOrder.paymentMethod,
      bankTransferInstructions: createdOrder.paymentMethod === 'bank_transfer' ? bankTransferInstructions : '',
      createdAt: createdOrder.createdAt.toISOString()
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Public handler for GET /orders/:reference?phone=...
 */
export async function getOrderTracking(req, res, next) {
  try {
    const rawRef = req.params.reference || '';
    const reference = rawRef.trim().toUpperCase();
    const rawPhone = typeof req.query.phone === 'string' ? req.query.phone : '';

    const normalizedQueryPhone = normalizePhone(rawPhone);
    if (!normalizedQueryPhone) {
      // Must return identical 404 to avoid leaking order existence
      throw new AppError('ORDER_NOT_FOUND', 'Order not found', 404);
    }

    const order = await prisma.order.findUnique({
      where: { reference },
      include: {
        items: true
      }
    });

    if (!order) {
      throw new AppError('ORDER_NOT_FOUND', 'Order not found', 404);
    }

    if (order.customerPhone !== normalizedQueryPhone) {
      // Return same 404 whether reference exists or not
      throw new AppError('ORDER_NOT_FOUND', 'Order not found', 404);
    }

    const trackingUrl = buildTrackingUrl(order.trackingNumber);

    return res.json({
      reference: order.reference,
      fulfillment: order.fulfillment,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      subtotal: order.subtotal,
      shippingFee: order.shippingFee,
      total: order.total,
      items: order.items.map((it) => ({
        productId: it.productId,
        name: it.name,
        size: it.size,
        quantity: it.quantity,
        unitPrice: it.unitPrice
      })),
      trackingNumber: order.trackingNumber || null,
      trackingUrl,
      postedAt: order.postedAt ? order.postedAt.toISOString() : null,
      readyAt: order.readyAt ? order.readyAt.toISOString() : null,
      deliveredAt: order.deliveredAt ? order.deliveredAt.toISOString() : null,
      collectedAt: order.collectedAt ? order.collectedAt.toISOString() : null,
      createdAt: order.createdAt.toISOString()
    });
  } catch (err) {
    next(err);
  }
}
