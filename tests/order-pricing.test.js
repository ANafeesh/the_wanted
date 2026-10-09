import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

describe('Order Pricing & Shipping Calculations', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    // Ensure test product exists
    await prisma.product.upsert({
      where: { id: 'tw-test-pricing-01' },
      update: {
        price: 5000,
        sizes: JSON.stringify(['M', 'L']),
        images: JSON.stringify(['img1.webp']),
        active: true
      },
      create: {
        id: 'tw-test-pricing-01',
        name: 'Pricing Test Garment',
        category: 'Test',
        price: 5000,
        sizes: JSON.stringify(['M', 'L']),
        images: JSON.stringify(['img1.webp']),
        active: true
      }
    });

    // Configure shipping fee = 400 and free shipping threshold = 8000
    await prisma.settings.upsert({
      where: { id: 1 },
      update: {
        shippingFee: 400,
        freeShippingThreshold: 8000,
        enabledPaymentMethodsPost: 'cod,bank_transfer',
        enabledPaymentMethodsPickup: 'pay_at_shop,bank_transfer'
      },
      create: {
        id: 1,
        shippingFee: 400,
        freeShippingThreshold: 8000,
        enabledPaymentMethodsPost: 'cod,bank_transfer',
        enabledPaymentMethodsPickup: 'pay_at_shop,bank_transfer'
      }
    });
  });

  afterAll(async () => {
    await prisma.orderItem.deleteMany({
      where: { productId: 'tw-test-pricing-01' }
    });
    await prisma.product.deleteMany({
      where: { id: 'tw-test-pricing-01' }
    });
  });

  it('computes unitPrice and subtotal on server, completely ignoring any client-sent price values', async () => {
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
        items: [
          {
            productId: 'tw-test-pricing-01',
            size: 'M',
            quantity: 1,
            price: 1, // Malicious client attempt to forge price
            unitPrice: 10 // Malicious client attempt to forge unit price
          }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body.items[0].unitPrice).toBe(5000);
    expect(res.body.subtotal).toBe(5000);
    // Subtotal 5000 is under 8000 threshold, so shipping is 400
    expect(res.body.shippingFee).toBe(400);
    expect(res.body.total).toBe(5400);
  });

  it('charges configured shipping fee when subtotal is below the free shipping threshold', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        fulfillment: 'post',
        customer: {
          name: 'Kamal Perera',
          phone: '+94 71 234 5678',
          address: '45 Peradeniya Road',
          city: 'Kandy',
          postalCode: '20000',
          district: 'Kandy'
        },
        paymentMethod: 'bank_transfer',
        items: [
          {
            productId: 'tw-test-pricing-01',
            size: 'M',
            quantity: 1
          }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body.subtotal).toBe(5000);
    expect(res.body.shippingFee).toBe(400);
    expect(res.body.total).toBe(5400);
  });

  it('applies free shipping (shippingFee = 0) when subtotal reaches or exceeds the threshold', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        fulfillment: 'post',
        customer: {
          name: 'Sunil Fernando',
          phone: '0723456789',
          address: '22 Negombo Road',
          city: 'Gampaha',
          postalCode: '11000',
          district: 'Gampaha'
        },
        paymentMethod: 'cod',
        items: [
          {
            productId: 'tw-test-pricing-01',
            size: 'M',
            quantity: 2 // 2 * 5000 = 10000 (>= 8000 threshold)
          }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body.subtotal).toBe(10000);
    expect(res.body.shippingFee).toBe(0);
    expect(res.body.total).toBe(10000);
  });

  it('never charges shipping fee for pickup orders (shippingFee is always 0)', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        fulfillment: 'pickup',
        customer: {
          name: 'Anura Kumara',
          phone: '0779876543'
        },
        paymentMethod: 'pay_at_shop',
        items: [
          {
            productId: 'tw-test-pricing-01',
            size: 'L',
            quantity: 1
          }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body.subtotal).toBe(5000);
    expect(res.body.shippingFee).toBe(0);
    expect(res.body.total).toBe(5000);
  });
});
