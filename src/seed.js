import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import { prisma } from './lib/prisma.js';
import { logger } from './lib/logger.js';

export async function runSeed() {
  console.log('--- Starting Database Seed ---');

  // 1. Seed or update Admin User
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@thewanted.lk').toLowerCase().trim();
  const adminPassword = process.env.ADMIN_PASSWORD || 'AdminSecurePassword123!';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash
    },
    create: {
      email: adminEmail,
      passwordHash
    }
  });
  console.log(`✓ Admin user configured: ${admin.email}`);

  // 2. Seed or update Settings
  const shippingFee = parseInt(process.env.SHIPPING_FEE, 10) || 0;
  const freeShippingThreshold =
    process.env.FREE_SHIPPING_THRESHOLD && process.env.FREE_SHIPPING_THRESHOLD.trim() !== ''
      ? parseInt(process.env.FREE_SHIPPING_THRESHOLD, 10)
      : null;
  const estimatedDelivery = process.env.ESTIMATED_DELIVERY || 'To be confirmed';
  const enabledPaymentMethodsPost = process.env.ENABLED_PAYMENT_METHODS_POST || 'cod,bank_transfer';
  const enabledPaymentMethodsPickup = process.env.ENABLED_PAYMENT_METHODS_PICKUP || 'pay_at_shop,bank_transfer';
  const bankTransferInstructions =
    process.env.BANK_TRANSFER_INSTRUCTIONS !== undefined
      ? process.env.BANK_TRANSFER_INSTRUCTIONS
      : 'Commercial Bank';
  const shopAddress = process.env.SHOP_ADDRESS || 'Shop address';
  const shopHours = process.env.SHOP_HOURS || 'Opening hours';
  const shopPhone = process.env.SHOP_PHONE || '+94 7X XXX XXXX';
  const shopMapUrl = process.env.SHOP_MAP_URL || '';
  const pickupNote = process.env.PICKUP_NOTE || 'We will contact you when your order is ready.';

  await prisma.settings.upsert({
    where: { id: 1 },
    update: {
      shippingFee,
      freeShippingThreshold,
      estimatedDelivery,
      enabledPaymentMethodsPost,
      enabledPaymentMethodsPickup,
      bankTransferInstructions,
      shopAddress,
      shopHours,
      shopPhone,
      shopMapUrl,
      pickupNote
    },
    create: {
      id: 1,
      shippingFee,
      freeShippingThreshold,
      estimatedDelivery,
      enabledPaymentMethodsPost,
      enabledPaymentMethodsPickup,
      bankTransferInstructions,
      shopAddress,
      shopHours,
      shopPhone,
      shopMapUrl,
      pickupNote
    }
  });
  console.log('✓ Store settings initialized');

  // 3. Seed Products if PRODUCTS_SEED_FILE is set
  const seedFile = process.env.PRODUCTS_SEED_FILE;
  if (seedFile && seedFile.trim() !== '') {
    const seedFilePath = path.resolve(process.cwd(), seedFile.trim());
    if (fs.existsSync(seedFilePath)) {
      const raw = fs.readFileSync(seedFilePath, 'utf8');
      const products = JSON.parse(raw);

      if (Array.isArray(products)) {
        for (const p of products) {
          const sizesStr = JSON.stringify(Array.isArray(p.sizes) ? p.sizes : []);
          const imagesStr = JSON.stringify(Array.isArray(p.images) ? p.images : []);

          await prisma.product.upsert({
            where: { id: p.id },
            update: {
              name: p.name,
              category: p.category,
              price: Number(p.price),
              originalPrice: p.originalPrice !== undefined ? Number(p.originalPrice) : null,
              sizes: sizesStr,
              images: imagesStr,
              description: p.description || null,
              sample: Boolean(p.sample),
              active: p.active !== undefined ? Boolean(p.active) : true
            },
            create: {
              id: p.id,
              name: p.name,
              category: p.category,
              price: Number(p.price),
              originalPrice: p.originalPrice !== undefined ? Number(p.originalPrice) : null,
              sizes: sizesStr,
              images: imagesStr,
              description: p.description || null,
              sample: Boolean(p.sample),
              active: p.active !== undefined ? Boolean(p.active) : true
            }
          });
        }
        console.log(`✓ Successfully seeded ${products.length} products from ${seedFile}`);
      } else {
        console.warn(`! Warning: Product seed file did not contain a JSON array.`);
      }
    } else {
      console.warn(`! Warning: Products seed file not found at ${seedFilePath}. Skipping products seed.`);
    }
  } else {
    console.log('ℹ PRODUCTS_SEED_FILE not set. Seeded only admin and settings.');
  }

  console.log('--- Database Seed Complete ---');
}

// Run directly when called via CLI
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  runSeed()
    .then(async () => {
      await prisma.$disconnect();
      process.exit(0);
    })
    .catch(async (e) => {
      console.error('Seed error:', e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
