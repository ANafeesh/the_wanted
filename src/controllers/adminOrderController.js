import { prisma } from '../lib/prisma.js';
import {
  updateOrderStatusSchema,
  updateOrderPaymentSchema,
  updateOrderTrackingSchema
} from '../validators/adminValidator.js';
import { normalizePhone } from '../lib/phone.js';
import { buildTrackingUrl } from '../lib/tracking.js';
import { AppError } from '../lib/errors.js';

// Status transition state machines
const POST_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['packed', 'cancelled'],
  packed: ['posted', 'cancelled'],
  posted: ['delivered', 'returned'],
  delivered: [],
  cancelled: [],
  returned: []
};

const PICKUP_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['ready_for_pickup', 'cancelled'],
  ready_for_pickup: ['collected', 'cancelled'],
  collected: [],
  cancelled: []
};

/**
 * Helper to format order for admin responses
 */
function formatOrderForAdmin(order) {
  return {
    reference: order.reference,
    fulfillment: order.fulfillment,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    subtotal: order.subtotal,
    shippingFee: order.shippingFee,
    total: order.total,
    customer: {
      name: order.customerName,
      phone: order.customerPhone,
      address: order.customerAddress,
      city: order.customerCity,
      postalCode: order.customerPostalCode,
      district: order.customerDistrict
    },
    notes: order.notes,
    items: (order.items || []).map((it) => ({
      productId: it.productId,
      name: it.name,
      size: it.size,
      quantity: it.quantity,
      unitPrice: it.unitPrice
    })),
    trackingNumber: order.trackingNumber || null,
    trackingUrl: buildTrackingUrl(order.trackingNumber),
    bankTransferInstructions: order.bankTransferInstructions || '',
    postedAt: order.postedAt ? order.postedAt.toISOString() : null,
    readyAt: order.readyAt ? order.readyAt.toISOString() : null,
    deliveredAt: order.deliveredAt ? order.deliveredAt.toISOString() : null,
    collectedAt: order.collectedAt ? order.collectedAt.toISOString() : null,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt ? order.updatedAt.toISOString() : null
  };
}

/**
 * List orders with filtering, search, and pagination: GET /admin/orders
 */
export async function getAdminOrders(req, res, next) {
  try {
    const { status, fulfillment, paymentStatus, search } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const where = {};

    if (status) {
      where.status = String(status).trim();
    }
    if (fulfillment) {
      where.fulfillment = String(fulfillment).trim();
    }
    if (paymentStatus) {
      where.paymentStatus = String(paymentStatus).trim();
    }

    if (search && String(search).trim()) {
      const q = String(search).trim();
      const normPhone = normalizePhone(q) || q.replace(/\D/g, '');
      where.OR = [
        { reference: { contains: q.toUpperCase() } },
        { customerPhone: { contains: normPhone || q } }
      ];
    }

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      })
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return res.json({
      orders: orders.map((o) => formatOrderForAdmin(o)),
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get detailed order: GET /admin/orders/:reference
 */
export async function getAdminOrderByReference(req, res, next) {
  try {
    const reference = (req.params.reference || '').trim().toUpperCase();

    const order = await prisma.order.findUnique({
      where: { reference },
      include: { items: true }
    });

    if (!order) {
      throw new AppError('ORDER_NOT_FOUND', `Order "${reference}" not found`, 404);
    }

    return res.json(formatOrderForAdmin(order));
  } catch (err) {
    next(err);
  }
}

/**
 * Update order status: PATCH /admin/orders/:reference/status
 */
export async function updateOrderStatus(req, res, next) {
  try {
    const reference = (req.params.reference || '').trim().toUpperCase();
    const { status: nextStatus } = updateOrderStatusSchema.parse(req.body);

    const order = await prisma.order.findUnique({
      where: { reference },
      include: { items: true }
    });

    if (!order) {
      throw new AppError('ORDER_NOT_FOUND', `Order "${reference}" not found`, 404);
    }

    // 1. Validate status transition according to fulfillment rules
    const allowedMap = order.fulfillment === 'post' ? POST_TRANSITIONS : PICKUP_TRANSITIONS;
    const allowed = allowedMap[order.status] || [];

    if (!allowed.includes(nextStatus)) {
      throw new AppError(
        'INVALID_STATUS_TRANSITION',
        `Cannot transition ${order.fulfillment} order from "${order.status}" to "${nextStatus}"`,
        409
      );
    }

    // 2. Bank transfer payment requirement rule:
    // bank_transfer orders cannot move to packed (post) or ready_for_pickup (pickup) until paymentStatus is "paid"
    if (
      order.paymentMethod === 'bank_transfer' &&
      (nextStatus === 'packed' || nextStatus === 'ready_for_pickup') &&
      order.paymentStatus !== 'paid'
    ) {
      throw new AppError(
        'PAYMENT_REQUIRED',
        'Bank transfer orders must have payment marked as "paid" before entering this status',
        409
      );
    }

    // 3. Timestamps & automatic payment marking
    const updateData = { status: nextStatus };
    const now = new Date();

    if (nextStatus === 'posted' && !order.postedAt) {
      updateData.postedAt = now;
    } else if (nextStatus === 'ready_for_pickup' && !order.readyAt) {
      updateData.readyAt = now;
    } else if (nextStatus === 'delivered' && !order.deliveredAt) {
      updateData.deliveredAt = now;
    } else if (nextStatus === 'collected' && !order.collectedAt) {
      updateData.collectedAt = now;
    }

    // cod orders become paid automatically when delivered
    if (nextStatus === 'delivered' && order.paymentMethod === 'cod') {
      updateData.paymentStatus = 'paid';
    }

    // pay_at_shop orders become paid automatically when collected
    if (nextStatus === 'collected' && order.paymentMethod === 'pay_at_shop') {
      updateData.paymentStatus = 'paid';
    }

    const updated = await prisma.order.update({
      where: { reference },
      data: updateData,
      include: { items: true }
    });

    return res.json(formatOrderForAdmin(updated));
  } catch (err) {
    next(err);
  }
}

/**
 * Update order payment status: PATCH /admin/orders/:reference/payment
 */
export async function updateOrderPayment(req, res, next) {
  try {
    const reference = (req.params.reference || '').trim().toUpperCase();
    const { paymentStatus } = updateOrderPaymentSchema.parse(req.body);

    const order = await prisma.order.findUnique({
      where: { reference }
    });

    if (!order) {
      throw new AppError('ORDER_NOT_FOUND', `Order "${reference}" not found`, 404);
    }

    const updated = await prisma.order.update({
      where: { reference },
      data: { paymentStatus },
      include: { items: true }
    });

    return res.json(formatOrderForAdmin(updated));
  } catch (err) {
    next(err);
  }
}

/**
 * Update order tracking number: PATCH /admin/orders/:reference/tracking
 * Tracking number can only be assigned when status is packed (moves to posted automatically) or posted (edit).
 */
export async function updateOrderTracking(req, res, next) {
  try {
    const reference = (req.params.reference || '').trim().toUpperCase();
    const { trackingNumber } = updateOrderTrackingSchema.parse(req.body);

    const order = await prisma.order.findUnique({
      where: { reference },
      include: { items: true }
    });

    if (!order) {
      throw new AppError('ORDER_NOT_FOUND', `Order "${reference}" not found`, 404);
    }

    if (order.status !== 'packed' && order.status !== 'posted') {
      throw new AppError(
        'INVALID_STATUS_TRANSITION',
        `A tracking number can only be set when status is "packed" or "posted" (current status: "${order.status}")`,
        409
      );
    }

    const updateData = { trackingNumber };

    // When status is packed, moving to posted automatically and setting postedAt
    if (order.status === 'packed') {
      updateData.status = 'posted';
      if (!order.postedAt) {
        updateData.postedAt = new Date();
      }
    }

    const updated = await prisma.order.update({
      where: { reference },
      data: updateData,
      include: { items: true }
    });

    return res.json(formatOrderForAdmin(updated));
  } catch (err) {
    next(err);
  }
}

/**
 * Get postal shipping label: GET /admin/orders/:reference/label
 * Post orders only. Contains address and item count; no prices.
 */
export async function getOrderLabel(req, res, next) {
  try {
    const reference = (req.params.reference || '').trim().toUpperCase();

    const order = await prisma.order.findUnique({
      where: { reference },
      include: { items: true }
    });

    if (!order) {
      throw new AppError('ORDER_NOT_FOUND', `Order "${reference}" not found`, 404);
    }

    if (order.fulfillment !== 'post') {
      throw new AppError('NOT_A_POSTAL_ORDER', 'Shipping labels are only available for postal delivery orders', 400);
    }

    const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

    return res.json({
      reference: order.reference,
      name: order.customerName,
      phone: order.customerPhone,
      address: order.customerAddress,
      city: order.customerCity,
      district: order.customerDistrict,
      postalCode: order.customerPostalCode,
      itemCount
    });
  } catch (err) {
    next(err);
  }
}
