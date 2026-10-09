import { prisma } from '../lib/prisma.js';
import { updateSettingsSchema } from '../validators/adminValidator.js';
import { getStoreSettings } from './configController.js';

/**
 * Get store settings: GET /admin/settings
 */
export async function getSettings(req, res, next) {
  try {
    const settings = await getStoreSettings();
    return res.json(settings);
  } catch (err) {
    next(err);
  }
}

/**
 * Update store settings: PUT /admin/settings
 */
export async function updateSettings(req, res, next) {
  try {
    const validated = updateSettingsSchema.parse(req.body);

    const postMethodsStr = Array.isArray(validated.enabledPaymentMethods.post)
      ? validated.enabledPaymentMethods.post.join(',')
      : 'cod,bank_transfer';

    const pickupMethodsStr = Array.isArray(validated.enabledPaymentMethods.pickup)
      ? validated.enabledPaymentMethods.pickup.join(',')
      : 'pay_at_shop,bank_transfer';

    await prisma.settings.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        shippingFee: validated.shippingFee,
        freeShippingThreshold:
          validated.freeShippingThreshold !== undefined ? validated.freeShippingThreshold : null,
        estimatedDelivery: validated.estimatedDelivery,
        enabledPaymentMethodsPost: postMethodsStr,
        enabledPaymentMethodsPickup: pickupMethodsStr,
        bankTransferInstructions: validated.bankTransferInstructions || '',
        shopAddress: validated.shop.address,
        shopHours: validated.shop.hours,
        shopPhone: validated.shop.phone,
        shopMapUrl: validated.shop.mapUrl || '',
        pickupNote: validated.pickupNote
      },
      update: {
        shippingFee: validated.shippingFee,
        freeShippingThreshold:
          validated.freeShippingThreshold !== undefined ? validated.freeShippingThreshold : null,
        estimatedDelivery: validated.estimatedDelivery,
        enabledPaymentMethodsPost: postMethodsStr,
        enabledPaymentMethodsPickup: pickupMethodsStr,
        bankTransferInstructions: validated.bankTransferInstructions || '',
        shopAddress: validated.shop.address,
        shopHours: validated.shop.hours,
        shopPhone: validated.shop.phone,
        shopMapUrl: validated.shop.mapUrl || '',
        pickupNote: validated.pickupNote
      }
    });

    const refreshed = await getStoreSettings();
    return res.json(refreshed);
  } catch (err) {
    next(err);
  }
}
