import { z } from 'zod';

export const adminLoginSchema = z.object({
  email: z.string({
    required_error: 'Email is required'
  }).email('Invalid email address'),
  password: z.string({
    required_error: 'Password is required'
  }).min(1, 'Password is required')
});

export const updateOrderStatusSchema = z.object({
  status: z.string({
    required_error: 'Status is required'
  }).trim().min(1, 'Status is required')
});

export const updateOrderPaymentSchema = z.object({
  paymentStatus: z.enum(['paid', 'unpaid'], {
    errorMap: () => ({ message: 'Payment status must be "paid" or "unpaid"' })
  })
});

export const updateOrderTrackingSchema = z.object({
  trackingNumber: z.string({
    required_error: 'Tracking number is required'
  }).trim().regex(/^[A-Za-z0-9\-]{3,40}$/, 'Tracking number must be 3 to 40 letters, digits or dashes')
});

export const createProductSchema = z.object({
  id: z.string().trim().min(1).optional(),
  name: z.string({
    required_error: 'Product name is required'
  }).trim().min(2, 'Name must be at least 2 characters'),
  category: z.string({
    required_error: 'Category is required'
  }).trim().min(2, 'Category must be at least 2 characters'),
  price: z.number({
    required_error: 'Price is required'
  }).int('Price must be an integer').min(0, 'Price must be non-negative'),
  originalPrice: z.number().int('Original price must be an integer').min(0).optional().nullable(),
  sizes: z.array(z.string().trim().min(1), {
    required_error: 'Sizes array is required'
  }).min(1, 'At least one size is required'),
  images: z.array(z.string().trim().min(1)).optional().default([]),
  description: z.string().optional().nullable(),
  sample: z.boolean().optional().default(false),
  active: z.boolean().optional().default(true)
});

export const updateProductSchema = createProductSchema.partial();

export const updateSettingsSchema = z.object({
  shippingFee: z.number({
    required_error: 'Shipping fee is required'
  }).int('Shipping fee must be an integer').min(0, 'Shipping fee must be >= 0'),
  freeShippingThreshold: z.number().int('Free shipping threshold must be an integer').min(0).optional().nullable(),
  estimatedDelivery: z.string({
    required_error: 'Estimated delivery is required'
  }).trim().min(1, 'Estimated delivery is required'),
  enabledPaymentMethods: z.object({
    post: z.array(z.string()).min(1, 'At least one post payment method required'),
    pickup: z.array(z.string()).min(1, 'At least one pickup payment method required')
  }),
  bankTransferInstructions: z.string().optional().default(''),
  shop: z.object({
    address: z.string({ required_error: 'Shop address is required' }),
    hours: z.string({ required_error: 'Shop hours is required' }),
    phone: z.string({ required_error: 'Shop phone is required' }),
    mapUrl: z.string().optional().default('')
  }),
  pickupNote: z.string({
    required_error: 'Pickup note is required'
  }).trim().min(1, 'Pickup note is required')
});
