import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

describe('Order Status Lifecycles & Transition Rules', () => {
  let adminToken = '';
  const adminEmail = 'admin-status-test@thewanted.lk';
  const adminPassword = 'AdminStatusPass123!';

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    // Ensure admin user exists
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await prisma.adminUser.upsert({
      where: { email: adminEmail },
      update: { passwordHash },
      create: { email: adminEmail, passwordHash }
    });

    // Obtain JWT token
    const loginRes = await request(app)
      .post('/api/admin/login')
      .send({ email: adminEmail, password: adminPassword });
    adminToken = loginRes.body.token;

    // Ensure product exists
    await prisma.product.upsert({
      where: { id: 'tw-test-status-01' },
      update: {
        price: 3000,
        sizes: JSON.stringify(['M', 'L']),
        images: JSON.stringify(['test.webp']),
        active: true
      },
      create: {
        id: 'tw-test-status-01',
        name: 'Status Test Item',
        category: 'Test',
        price: 3000,
        sizes: JSON.stringify(['M', 'L']),
        images: JSON.stringify(['test.webp']),
        active: true
      }
    });

    // Enable all payment methods
    await prisma.settings.upsert({
      where: { id: 1 },
      update: {
        shippingFee: 0,
        enabledPaymentMethodsPost: 'cod,bank_transfer',
        enabledPaymentMethodsPickup: 'pay_at_shop,bank_transfer'
      },
      create: {
        id: 1,
        shippingFee: 0,
        enabledPaymentMethodsPost: 'cod,bank_transfer',
        enabledPaymentMethodsPickup: 'pay_at_shop,bank_transfer'
      }
    });
  });

  afterAll(async () => {
    await prisma.adminUser.deleteMany({ where: { email: adminEmail } });
    await prisma.orderItem.deleteMany({ where: { productId: 'tw-test-status-01' } });
    await prisma.product.deleteMany({ where: { id: 'tw-test-status-01' } });
  });

  // Helper to create order
  async function createTestOrder(fulfillment, paymentMethod) {
    const res = await request(app)
      .post('/api/orders')
      .send({
        fulfillment,
        customer: {
          name: 'Status Tester',
          phone: '0771122334',
          ...(fulfillment === 'post'
            ? {
                address: '10 High Street',
                city: 'Colombo',
                postalCode: '00100',
                district: 'Colombo'
              }
            : {})
        },
        paymentMethod,
        items: [{ productId: 'tw-test-status-01', size: 'M', quantity: 1 }]
      });
    return res.body;
  }

  it('completes the full postal order lifecycle: pending -> confirmed -> packed -> posted -> delivered', async () => {
    const order = await createTestOrder('post', 'cod');
    const ref = order.reference;

    // 1. pending -> confirmed
    const res1 = await request(app)
      .patch(`/api/admin/orders/${ref}/status`)
      .set('Cookie', [`admin_token=${adminToken}`])
      .send({ status: 'confirmed' });
    expect(res1.status).toBe(200);
    expect(res1.body.status).toBe('confirmed');

    // 2. confirmed -> packed
    const res2 = await request(app)
      .patch(`/api/admin/orders/${ref}/status`)
      .set('Cookie', [`admin_token=${adminToken}`])
      .send({ status: 'packed' });
    expect(res2.status).toBe(200);
    expect(res2.body.status).toBe('packed');

    // 3. packed -> posted
    const res3 = await request(app)
      .patch(`/api/admin/orders/${ref}/status`)
      .set('Cookie', [`admin_token=${adminToken}`])
      .send({ status: 'posted' });
    expect(res3.status).toBe(200);
    expect(res3.body.status).toBe('posted');
    expect(res3.body.postedAt).not.toBeNull();

    // 4. posted -> delivered (cod automatically becomes paid on delivered)
    const res4 = await request(app)
      .patch(`/api/admin/orders/${ref}/status`)
      .set('Cookie', [`admin_token=${adminToken}`])
      .send({ status: 'delivered' });
    expect(res4.status).toBe(200);
    expect(res4.body.status).toBe('delivered');
    expect(res4.body.deliveredAt).not.toBeNull();
    expect(res4.body.paymentStatus).toBe('paid'); // Auto marked paid!

    // 5. delivered is terminal -> cannot transition to any status
    const res5 = await request(app)
      .patch(`/api/admin/orders/${ref}/status`)
      .set('Cookie', [`admin_token=${adminToken}`])
      .send({ status: 'returned' });
    expect(res5.status).toBe(409);
    expect(res5.body.error.code).toBe('INVALID_STATUS_TRANSITION');
  });

  it('completes the full pickup order lifecycle: pending -> confirmed -> ready_for_pickup -> collected', async () => {
    const order = await createTestOrder('pickup', 'pay_at_shop');
    const ref = order.reference;

    // 1. pending -> confirmed
    const res1 = await request(app)
      .patch(`/api/admin/orders/${ref}/status`)
      .set('Cookie', [`admin_token=${adminToken}`])
      .send({ status: 'confirmed' });
    expect(res1.status).toBe(200);
    expect(res1.body.status).toBe('confirmed');

    // 2. confirmed -> ready_for_pickup
    const res2 = await request(app)
      .patch(`/api/admin/orders/${ref}/status`)
      .set('Cookie', [`admin_token=${adminToken}`])
      .send({ status: 'ready_for_pickup' });
    expect(res2.status).toBe(200);
    expect(res2.body.status).toBe('ready_for_pickup');
    expect(res2.body.readyAt).not.toBeNull();

    // 3. ready_for_pickup -> collected (pay_at_shop automatically becomes paid on collected)
    const res3 = await request(app)
      .patch(`/api/admin/orders/${ref}/status`)
      .set('Cookie', [`admin_token=${adminToken}`])
      .send({ status: 'collected' });
    expect(res3.status).toBe(200);
    expect(res3.body.status).toBe('collected');
    expect(res3.body.collectedAt).not.toBeNull();
    expect(res3.body.paymentStatus).toBe('paid'); // Auto marked paid!

    // 4. collected is terminal -> cannot transition to any status
    const res4 = await request(app)
      .patch(`/api/admin/orders/${ref}/status`)
      .set('Cookie', [`admin_token=${adminToken}`])
      .send({ status: 'cancelled' });
    expect(res4.status).toBe(409);
    expect(res4.body.error.code).toBe('INVALID_STATUS_TRANSITION');
  });

  it('blocks bank_transfer orders from advancing to packed or ready_for_pickup until paymentStatus is paid', async () => {
    // 1. Postal bank transfer order
    const postOrder = await createTestOrder('post', 'bank_transfer');
    const postRef = postOrder.reference;

    // Move to confirmed
    await request(app)
      .patch(`/api/admin/orders/${postRef}/status`)
      .set('Cookie', [`admin_token=${adminToken}`])
      .send({ status: 'confirmed' });

    // Try to move to packed while unpaid -> 409 PAYMENT_REQUIRED
    const blockedPostRes = await request(app)
      .patch(`/api/admin/orders/${postRef}/status`)
      .set('Cookie', [`admin_token=${adminToken}`])
      .send({ status: 'packed' });
    expect(blockedPostRes.status).toBe(409);
    expect(blockedPostRes.body.error.code).toBe('PAYMENT_REQUIRED');

    // Mark as paid
    const payPostRes = await request(app)
      .patch(`/api/admin/orders/${postRef}/payment`)
      .set('Cookie', [`admin_token=${adminToken}`])
      .send({ paymentStatus: 'paid' });
    expect(payPostRes.status).toBe(200);
    expect(payPostRes.body.paymentStatus).toBe('paid');

    // Now move to packed succeeds
    const allowedPostRes = await request(app)
      .patch(`/api/admin/orders/${postRef}/status`)
      .set('Cookie', [`admin_token=${adminToken}`])
      .send({ status: 'packed' });
    expect(allowedPostRes.status).toBe(200);
    expect(allowedPostRes.body.status).toBe('packed');

    // 2. Pickup bank transfer order
    const pickupOrder = await createTestOrder('pickup', 'bank_transfer');
    const pickupRef = pickupOrder.reference;

    await request(app)
      .patch(`/api/admin/orders/${pickupRef}/status`)
      .set('Cookie', [`admin_token=${adminToken}`])
      .send({ status: 'confirmed' });

    // Try to move to ready_for_pickup while unpaid -> 409 PAYMENT_REQUIRED
    const blockedPickupRes = await request(app)
      .patch(`/api/admin/orders/${pickupRef}/status`)
      .set('Cookie', [`admin_token=${adminToken}`])
      .send({ status: 'ready_for_pickup' });
    expect(blockedPickupRes.status).toBe(409);
    expect(blockedPickupRes.body.error.code).toBe('PAYMENT_REQUIRED');

    // Mark as paid
    await request(app)
      .patch(`/api/admin/orders/${pickupRef}/payment`)
      .set('Cookie', [`admin_token=${adminToken}`])
      .send({ paymentStatus: 'paid' });

    // Now move to ready_for_pickup succeeds
    const allowedPickupRes = await request(app)
      .patch(`/api/admin/orders/${pickupRef}/status`)
      .set('Cookie', [`admin_token=${adminToken}`])
      .send({ status: 'ready_for_pickup' });
    expect(allowedPickupRes.status).toBe(200);
    expect(allowedPickupRes.body.status).toBe('ready_for_pickup');
  });

  it('permits tracking numbers only when status is packed or posted, moving packed to posted automatically', async () => {
    const order = await createTestOrder('post', 'cod');
    const ref = order.reference;

    // While pending: setting tracking number must be rejected
    const resPending = await request(app)
      .patch(`/api/admin/orders/${ref}/tracking`)
      .set('Cookie', [`admin_token=${adminToken}`])
      .send({ trackingNumber: 'SL-12345678' });
    expect(resPending.status).toBe(409);

    // Advance to confirmed
    await request(app)
      .patch(`/api/admin/orders/${ref}/status`)
      .set('Cookie', [`admin_token=${adminToken}`])
      .send({ status: 'confirmed' });

    // While confirmed: setting tracking number must also be rejected
    const resConfirmed = await request(app)
      .patch(`/api/admin/orders/${ref}/tracking`)
      .set('Cookie', [`admin_token=${adminToken}`])
      .send({ trackingNumber: 'SL-12345678' });
    expect(resConfirmed.status).toBe(409);

    // Advance to packed
    await request(app)
      .patch(`/api/admin/orders/${ref}/status`)
      .set('Cookie', [`admin_token=${adminToken}`])
      .send({ status: 'packed' });

    // When packed: setting tracking number succeeds and transitions order to posted automatically
    const resPacked = await request(app)
      .patch(`/api/admin/orders/${ref}/tracking`)
      .set('Cookie', [`admin_token=${adminToken}`])
      .send({ trackingNumber: 'SL-12345678' });
    expect(resPacked.status).toBe(200);
    expect(resPacked.body.status).toBe('posted');
    expect(resPacked.body.trackingNumber).toBe('SL-12345678');
    expect(resPacked.body.postedAt).not.toBeNull();

    // When posted: editing tracking number succeeds
    const resPosted = await request(app)
      .patch(`/api/admin/orders/${ref}/tracking`)
      .set('Cookie', [`admin_token=${adminToken}`])
      .send({ trackingNumber: 'SL-87654321' });
    expect(resPosted.status).toBe(200);
    expect(resPosted.body.trackingNumber).toBe('SL-87654321');
  });

  it('allows cancellation from non-terminal states and returned from posted state', async () => {
    // 1. Cancel from pending
    const order1 = await createTestOrder('post', 'cod');
    const resCancel = await request(app)
      .patch(`/api/admin/orders/${order1.reference}/status`)
      .set('Cookie', [`admin_token=${adminToken}`])
      .send({ status: 'cancelled' });
    expect(resCancel.status).toBe(200);
    expect(resCancel.body.status).toBe('cancelled');

    // 2. Return from posted
    const order2 = await createTestOrder('post', 'cod');
    await request(app)
      .patch(`/api/admin/orders/${order2.reference}/status`)
      .set('Cookie', [`admin_token=${adminToken}`])
      .send({ status: 'confirmed' });
    await request(app)
      .patch(`/api/admin/orders/${order2.reference}/status`)
      .set('Cookie', [`admin_token=${adminToken}`])
      .send({ status: 'packed' });
    await request(app)
      .patch(`/api/admin/orders/${order2.reference}/status`)
      .set('Cookie', [`admin_token=${adminToken}`])
      .send({ status: 'posted' });

    const resReturn = await request(app)
      .patch(`/api/admin/orders/${order2.reference}/status`)
      .set('Cookie', [`admin_token=${adminToken}`])
      .send({ status: 'returned' });
    expect(resReturn.status).toBe(200);
    expect(resReturn.body.status).toBe('returned');

    // Returned is terminal
    const resTerminal = await request(app)
      .patch(`/api/admin/orders/${order2.reference}/status`)
      .set('Cookie', [`admin_token=${adminToken}`])
      .send({ status: 'delivered' });
    expect(resTerminal.status).toBe(409);
  });
});
