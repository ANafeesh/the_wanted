import { z } from 'zod';
import { SRI_LANKA_DISTRICTS } from '../constants/districts.js';
import { normalizePhone } from '../lib/phone.js';

const orderItemSchema = z.object({
  productId: z.string({
    required_error: 'Product ID is required',
    invalid_type_error: 'Product ID must be a string'
  }).min(1, 'Product ID is required'),
  size: z.string({
    required_error: 'Size is required',
    invalid_type_error: 'Size must be a string'
  }).min(1, 'Size is required'),
  quantity: z.number({
    required_error: 'Quantity is required',
    invalid_type_error: 'Quantity must be a number'
  }).int('Quantity must be an integer').min(1, 'Quantity must be at least 1').max(10, 'Quantity cannot exceed 10')
});

export const createOrderSchema = z.object({
  fulfillment: z.enum(['post', 'pickup'], {
    errorMap: () => ({ message: 'Fulfillment must be "post" or "pickup"' })
  }),
  customer: z.object({
    name: z.string({
      required_error: 'Customer name is required'
    }).trim().min(2, 'Customer name must be at least 2 characters').max(80, 'Customer name cannot exceed 80 characters'),
    phone: z.string({
      required_error: 'Phone number is required'
    }).refine((val) => normalizePhone(val) !== null, {
      message: 'Invalid Sri Lankan phone number. Expected 07XXXXXXXX, +947XXXXXXXX or 947XXXXXXXX'
    }),
    address: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    postalCode: z.string().optional().nullable(),
    district: z.string().optional().nullable()
  }),
  paymentMethod: z.enum(['cod', 'bank_transfer', 'pay_at_shop'], {
    errorMap: () => ({ message: 'Payment method must be "cod", "bank_transfer", or "pay_at_shop"' })
  }),
  items: z.array(orderItemSchema, {
    required_error: 'Order items are required'
  }).min(1, 'Order must contain at least 1 item').max(20, 'Order cannot exceed 20 line items'),
  notes: z.string().max(300, 'Notes cannot exceed 300 characters').optional().nullable()
}).superRefine((data, ctx) => {
  if (data.fulfillment === 'post') {
    // Postal delivery requirements
    const addr = data.customer.address ? data.customer.address.trim() : '';
    if (!addr || addr.length < 5 || addr.length > 200) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Postal address must be between 5 and 200 characters',
        path: ['customer', 'address']
      });
    }

    const city = data.customer.city ? data.customer.city.trim() : '';
    if (!city || city.length < 2 || city.length > 60) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'City must be between 2 and 60 characters',
        path: ['customer', 'city']
      });
    }

    const postalCode = data.customer.postalCode ? data.customer.postalCode.trim() : '';
    if (!postalCode || !/^\d{5}$/.test(postalCode)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Postal code must be exactly 5 digits',
        path: ['customer', 'postalCode']
      });
    }

    const district = data.customer.district ? data.customer.district.trim() : '';
    if (!district || !SRI_LANKA_DISTRICTS.includes(district)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'District must be one of Sri Lanka\'s 25 districts',
        path: ['customer', 'district']
      });
    }

    if (data.paymentMethod === 'pay_at_shop') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Pay at shop is only available for shop pickup',
        path: ['paymentMethod']
      });
    }
  }

  if (data.fulfillment === 'pickup') {
    if (data.paymentMethod === 'cod') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Cash on delivery is only available for postal delivery',
        path: ['paymentMethod']
      });
    }
  }
});
