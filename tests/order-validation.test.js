import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

describe('Order Validation & Constraints', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    // Create test product with sizes M and L
    await prisma.product.upsert({
      where: { id: 'tw-test-val-01' },
      update: {
        price: 4500,
        sizes: JSON.stringify(['M', 'L']),
        images: JSON.stringify(['test.webp']),
        active: true
      },
      create: {
        id: 'tw-test-val-01',
        name: 'Validation Test Item',
        category: 'Test',
        price: 4500,
        sizes: JSON.stringify(['M', 'L']),
        images: JSON.stringify(['test.webp']),
        active: true
      }
    });

    // Configure enabled payment methods: post has only cod; pickup has only pay_at_shop
    await prisma.settings.upsert({
      where: { id: 1 },
      update: {
        shippingFee: 0,
        enabledPaymentMethodsPost: 'cod', // bank_transfer disabled for post
        enabledPaymentMethodsPickup: 'pay_at_shop' // bank_transfer disabled for pickup
      },
      create: {
        id: 1,
        shippingFee: 0,
        enabledPaymentMethodsPost: 'cod',
        enabledPaymentMethodsPickup: 'pay_at_shop'
      }
    });
  });

  afterAll(async () => {
    await prisma.orderItem.deleteMany({
      where: { productId: 'tw-test-val-01' }
    });
    await prisma.product.deleteMany({
      where: { id: 'tw-test-val-01' }
    });
  });

  it('rejects postal order if postal code is missing or not exactly 5 digits', async () => {
    // Missing postal code
    const res1 = await request(app)
      .post('/api/orders')
      .send({
        fulfillment: 'post',
        customer: {
          name: 'Nimal Silva',
          phone: '0771234567',
          address: '100 Galle Road',
          city: 'Colombo',
          district: 'Colombo'
        },
        paymentMethod: 'cod',
        items: [{ productId: 'tw-test-val-01', size: 'M', quantity: 1 }]
      });

    expect(res1.status).toBe(400);
    expect(res1.body.error.code).toBe('INVALID_INPUT');
    expect(res1.body.error.fields).toHaveProperty('customer.postalCode');

    // Invalid format (4 digits)
    const res2 = await request(app)
      .post('/api/orders')
      .send({
        fulfillment: 'post',
        customer: {
          name: 'Nimal Silva',
          phone: '0771234567',
          address: '100 Galle Road',
          city: 'Colombo',
          postalCode: '1234',
          district: 'Colombo'
        },
        paymentMethod: 'cod',
        items: [{ productId: 'tw-test-val-01', size: 'M', quantity: 1 }]
      });

    expect(res2.status).toBe(400);
    expect(res2.body.error.fields).toHaveProperty('customer.postalCode');
  });

  it('rejects postal order if district is not one of Sri Lanka\'s 25 districts', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        fulfillment: 'post',
        customer: {
          name: 'Nimal Silva',
          phone: '0771234567',
          address: '100 Galle Road',
          city: 'Colombo',
          postalCode: '00300',
          district: 'Atlantis' // Not a valid district
        },
        paymentMethod: 'cod',
        items: [{ productId: 'tw-test-val-01', size: 'M', quantity: 1 }]
      });

    expect(res.status).toBe(400);
    expect(res.body.error.fields).toHaveProperty('customer.district');
  });

  it('rejects cash on delivery (cod) for pickup orders', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        fulfillment: 'pickup',
        customer: {
          name: 'Nimal Silva',
          phone: '0771234567'
        },
        paymentMethod: 'cod', // COD is post only
        items: [{ productId: 'tw-test-val-01', size: 'M', quantity: 1 }]
      });

    expect(res.status).toBe(400);
    expect(res.body.error.fields).toHaveProperty('paymentMethod');
  });

  it('rejects pay at shop (pay_at_shop) for postal orders', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        fulfillment: 'post',
        customer: {
          name: 'Nimal Silva',
          phone: '0771234567',
          address: '100 Galle Road',
          city: 'Colombo',
          postalCode: '00300',
          district: 'Colombo'
        },
        paymentMethod: 'pay_at_shop', // Pay at shop is pickup only
        items: [{ productId: 'tw-test-val-01', size: 'M', quantity: 1 }]
      });

    expect(res.status).toBe(400);
    expect(res.body.error.fields).toHaveProperty('paymentMethod');
  });

  it('rejects payment method if not currently enabled in store configuration', async () => {
    // Bank transfer is disabled in beforeAll for post
    const res = await request(app)
      .post('/api/orders')
      .send({
        fulfillment: 'post',
        customer: {
          name: 'Nimal Silva',
          phone: '0771234567',
          address: '100 Galle Road',
          city: 'Colombo',
          postalCode: '00300',
          district: 'Colombo'
        },
        paymentMethod: 'bank_transfer',
        items: [{ productId: 'tw-test-val-01', size: 'M', quantity: 1 }]
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('PAYMENT_METHOD_UNAVAILABLE');
  });

  it('rejects order if requested size is not offered by the product', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        fulfillment: 'post',
        customer: {
          name: 'Nimal Silva',
          phone: '0771234567',
          address: '100 Galle Road',
          city: 'Colombo',
          postalCode: '00300',
          district: 'Colombo'
        },
        paymentMethod: 'cod',
        items: [{ productId: 'tw-test-val-01', size: 'XXL', quantity: 1 }] // Product only offers M and L
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_SIZE');
  });

  it('returns identical 404 when tracking with non-matching phone number or non-existent reference', async () => {
    // 1. Create a valid order
    const createRes = await request(app)
      .post('/api/orders')
      .send({
        fulfillment: 'post',
        customer: {
          name: 'Kasun Perera',
          phone: '0771234567',
          address: '10 Galle Road',
          city: 'Colombo',
          postalCode: '00300',
          district: 'Colombo'
        },
        paymentMethod: 'cod',
        items: [{ productId: 'tw-test-val-01', size: 'M', quantity: 1 }]
      });

    expect(createRes.status).toBe(201);
    const ref = createRes.body.reference;

    // 2. Query with wrong phone number -> 404 ORDER_NOT_FOUND
    const wrongPhoneRes = await request(app).get(`/api/orders/${ref}?phone=0719999999`);
    expect(wrongPhoneRes.status).toBe(404);
    expect(wrongPhoneRes.body.error.code).toBe('ORDER_NOT_FOUND');

    // 3. Query with non-existent reference -> 404 ORDER_NOT_FOUND (identical error structure)
    const nonexistentRes = await request(app).get('/api/orders/TW-999999?phone=0771234567');
    expect(nonexistentRes.status).toBe(404);
    expect(nonexistentRes.body.error.code).toBe('ORDER_NOT_FOUND');
    expect(nonexistentRes.body).toEqual(wrongPhoneRes.body);

    // 4. Query with correct phone (with formatting spaces / international prefix) -> 200 OK
    const correctRes = await request(app).get(`/api/orders/${ref}?phone=+94 77 123 4567`);
    expect(correctRes.status).toBe(200);
    expect(correctRes.body.reference).toBe(ref);
  });
});
