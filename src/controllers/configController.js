import { prisma } from '../lib/prisma.js';

/**
 * Retrieves the store configuration and settings from the database.
 * Falls back to default store settings if none are initialized.
 *
 * @returns {Promise<Object>} Formatted StoreConfig object
 */
export async function getStoreSettings() {
  const settings = await prisma.settings.findUnique({
    where: { id: 1 }
  });

  if (!settings) {
    return {
      shippingFee: 0,
      freeShippingThreshold: null,
      estimatedDelivery: 'To be confirmed',
      enabledPaymentMethods: {
        post: ['cod', 'bank_transfer'],
        pickup: ['pay_at_shop', 'bank_transfer']
      },
      bankTransferInstructions: '',
      shop: {
        address: 'Shop address',
        hours: 'Opening hours',
        phone: '+94 7X XXX XXXX',
        mapUrl: ''
      },
      pickupNote: 'We will contact you when your order is ready.'
    };
  }

  const postMethods = settings.enabledPaymentMethodsPost
    ? settings.enabledPaymentMethodsPost.split(',').map((s) => s.trim()).filter(Boolean)
    : ['cod', 'bank_transfer'];

  const pickupMethods = settings.enabledPaymentMethodsPickup
    ? settings.enabledPaymentMethodsPickup.split(',').map((s) => s.trim()).filter(Boolean)
    : ['pay_at_shop', 'bank_transfer'];

  return {
    shippingFee: Number(settings.shippingFee),
    freeShippingThreshold:
      settings.freeShippingThreshold !== null && settings.freeShippingThreshold !== undefined
        ? Number(settings.freeShippingThreshold)
        : null,
    estimatedDelivery: settings.estimatedDelivery,
    enabledPaymentMethods: {
      post: postMethods,
      pickup: pickupMethods
    },
    bankTransferInstructions: settings.bankTransferInstructions || '',
    shop: {
      address: settings.shopAddress,
      hours: settings.shopHours,
      phone: settings.shopPhone,
      mapUrl: settings.shopMapUrl || ''
    },
    pickupNote: settings.pickupNote
  };
}

/**
 * Public handler for GET /config
 */
export async function getConfig(req, res, next) {
  try {
    const config = await getStoreSettings();
    return res.json(config);
  } catch (err) {
    next(err);
  }
}
