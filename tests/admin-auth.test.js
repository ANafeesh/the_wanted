import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

describe('Admin Authentication & Protected Management Routes', () => {
  const adminEmail = 'superadmin-test@thewanted.lk';
  const adminPassword = 'AdminSecretPass123!';
  let adminToken = '';

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    // Create admin user
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await prisma.adminUser.upsert({
      where: { email: adminEmail },
      update: { passwordHash },
      create: { email: adminEmail, passwordHash }
    });
  });

  afterAll(async () => {
    await prisma.adminUser.deleteMany({ where: { email: adminEmail } });
    await prisma.product.deleteMany({ where: { id: 'tw-admin-prod-01' } });
  });

  it('rejects protected admin routes when unauthenticated with 401 UNAUTHORIZED', async () => {
    const resOrders = await request(app).get('/api/admin/orders');
    expect(resOrders.status).toBe(401);
    expect(resOrders.body.error.code).toBe('UNAUTHORIZED');

    const resMe = await request(app).get('/api/admin/me');
    expect(resMe.status).toBe(401);
    expect(resMe.body.error.code).toBe('UNAUTHORIZED');

    const resSettings = await request(app).get('/api/admin/settings');
    expect(resSettings.status).toBe(401);
    expect(resSettings.body.error.code).toBe('UNAUTHORIZED');

    const resProducts = await request(app).get('/api/admin/products');
    expect(resProducts.status).toBe(401);
    expect(resProducts.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects login with invalid password', async () => {
    const res = await request(app)
      .post('/api/admin/login')
      .send({ email: adminEmail, password: 'WrongPassword!' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('logs in successfully, sets httpOnly cookie, and allows access to GET /admin/me', async () => {
    const res = await request(app)
      .post('/api/admin/login')
      .send({ email: adminEmail, password: adminPassword });

    expect(res.status).toBe(200);
    expect(res.body.admin.email).toBe(adminEmail);
    expect(res.body).toHaveProperty('token');
    adminToken = res.body.token;

    // Check Set-Cookie header
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const tokenCookie = cookies.find((c) => c.startsWith('admin_token='));
    expect(tokenCookie).toBeDefined();
    expect(tokenCookie).toContain('HttpOnly');
    expect(tokenCookie).toContain('SameSite=Lax');

    // Access /admin/me using the cookie
    const meRes = await request(app)
      .get('/api/admin/me')
      .set('Cookie', [tokenCookie]);

    expect(meRes.status).toBe(200);
    expect(meRes.body.admin.email).toBe(adminEmail);
  });

  it('creates, updates, lists (including inactive), and soft deletes products', async () => {
    // 1. Create product
    const createRes = await request(app)
      .post('/api/admin/products')
      .set('Cookie', [`admin_token=${adminToken}`])
      .send({
        id: 'tw-admin-prod-01',
        name: 'Admin Test Cargo Pants',
        category: 'Pants',
        price: 8500,
        originalPrice: 12000,
        sizes: ['30', '32', '34'],
        images: ['cargo-01.webp'],
        description: 'Heavy duty cargo pants',
        sample: false,
        active: true
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.id).toBe('tw-admin-prod-01');
    expect(createRes.body.active).toBe(true);

    // 2. Update product
    const updateRes = await request(app)
      .put('/api/admin/products/tw-admin-prod-01')
      .set('Cookie', [`admin_token=${adminToken}`])
      .send({
        price: 8900
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.price).toBe(8900);

    // 3. Soft delete product
    const deleteRes = await request(app)
      .delete('/api/admin/products/tw-admin-prod-01')
      .set('Cookie', [`admin_token=${adminToken}`]);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.product.active).toBe(false);

    // 4. Verify public /products does NOT include inactive product
    const publicList = await request(app).get('/api/products');
    expect(publicList.status).toBe(200);
    const foundInPublic = publicList.body.find((p) => p.id === 'tw-admin-prod-01');
    expect(foundInPublic).toBeUndefined();

    // 5. Verify admin /admin/products DOES include inactive product
    const adminList = await request(app)
      .get('/api/admin/products')
      .set('Cookie', [`admin_token=${adminToken}`]);

    expect(adminList.status).toBe(200);
    const foundInAdmin = adminList.body.find((p) => p.id === 'tw-admin-prod-01');
    expect(foundInAdmin).toBeDefined();
    expect(foundInAdmin.active).toBe(false);
  });

  it('manages store settings via GET and PUT /admin/settings', async () => {
    const updateRes = await request(app)
      .put('/api/admin/settings')
      .set('Cookie', [`admin_token=${adminToken}`])
      .send({
        shippingFee: 350,
        freeShippingThreshold: 12000,
        estimatedDelivery: '2-4 business days',
        enabledPaymentMethods: {
          post: ['cod', 'bank_transfer'],
          pickup: ['pay_at_shop', 'bank_transfer']
        },
        bankTransferInstructions: 'HNB Bank, Acc: 987654321',
        shop: {
          address: 'Kandy Outlet Center, Dalada Veediya',
          hours: 'Monday – Saturday: 9:00 AM – 7:00 PM',
          phone: '+94 81 223 3445',
          mapUrl: 'https://maps.google.com/?q=kandy'
        },
        pickupNote: 'Please present your reference code at counter 1.'
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.shippingFee).toBe(350);
    expect(updateRes.body.freeShippingThreshold).toBe(12000);
    expect(updateRes.body.estimatedDelivery).toBe('2-4 business days');
    expect(updateRes.body.shop.phone).toBe('+94 81 223 3445');

    // Public /api/config reflects the updated settings
    const configRes = await request(app).get('/api/config');
    expect(configRes.status).toBe(200);
    expect(configRes.body.shippingFee).toBe(350);
    expect(configRes.body.freeShippingThreshold).toBe(12000);
  });

  it('generates shipping labels only for postal orders with no price data', async () => {
    // 1. Postal order
    const postOrderRes = await request(app)
      .post('/api/orders')
      .send({
        fulfillment: 'post',
        customer: {
          name: 'Janaka Bandara',
          phone: '0775566778',
          address: '77 Temple Road',
          city: 'Kandy',
          postalCode: '20000',
          district: 'Kandy'
        },
        paymentMethod: 'cod',
        items: [{ productId: 'tw-hd-01', size: 'M', quantity: 2 }]
      });

    expect(postOrderRes.status).toBe(201);
    const postRef = postOrderRes.body.reference;

    const labelRes = await request(app)
      .get(`/api/admin/orders/${postRef}/label`)
      .set('Cookie', [`admin_token=${adminToken}`]);

    expect(labelRes.status).toBe(200);
    expect(labelRes.body.reference).toBe(postRef);
    expect(labelRes.body.name).toBe('Janaka Bandara');
    expect(labelRes.body.address).toBe('77 Temple Road');
    expect(labelRes.body.city).toBe('Kandy');
    expect(labelRes.body.district).toBe('Kandy');
    expect(labelRes.body.postalCode).toBe('20000');
    expect(labelRes.body.itemCount).toBe(2);
    // Crucial rule: NO prices in shipping label
    expect(labelRes.body).not.toHaveProperty('subtotal');
    expect(labelRes.body).not.toHaveProperty('total');
    expect(labelRes.body).not.toHaveProperty('price');

    // 2. Pickup order rejected for label
    const pickupOrderRes = await request(app)
      .post('/api/orders')
      .send({
        fulfillment: 'pickup',
        customer: {
          name: 'Janaka Bandara',
          phone: '0775566778'
        },
        paymentMethod: 'pay_at_shop',
        items: [{ productId: 'tw-hd-01', size: 'M', quantity: 1 }]
      });

    expect(pickupOrderRes.status).toBe(201);
    const pickupRef = pickupOrderRes.body.reference;

    const pickupLabelRes = await request(app)
      .get(`/api/admin/orders/${pickupRef}/label`)
      .set('Cookie', [`admin_token=${adminToken}`]);

    expect(pickupLabelRes.status).toBe(400);
    expect(pickupLabelRes.body.error.code).toBe('NOT_A_POSTAL_ORDER');
  });

  it('logs out and clears the auth cookie', async () => {
    const res = await request(app)
      .post('/api/admin/logout')
      .set('Cookie', [`admin_token=${adminToken}`]);

    expect(res.status).toBe(200);
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    // Cookie cleared
    expect(cookies.some((c) => c.includes('admin_token=;'))).toBe(true);
  });
});
