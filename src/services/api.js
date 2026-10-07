/**
 * The Wanted — API Service Layer
 * 
 * Provides an async interface for all data access:
 * - getProducts()
 * - getProduct(id)
 * - getConfig()
 * - createOrder(order)
 * - getOrderStatus(reference, phone)
 * 
 * Configured via import.meta.env.VITE_API_URL.
 * When VITE_API_URL is set, sends HTTP fetch requests to the remote Node.js backend.
 * When VITE_API_URL is not set, falls back to local products.json & localStorage.
 */

import productsData from '../data/products.json';
import { defaultConfig } from '../data/content';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const ORDERS_STORAGE_KEY = 'the_wanted_orders_v2';

/**
 * Normalizes Sri Lankan phone numbers for comparison (strips non-digits, normalizes 94 prefix to 0).
 */
function normalizePhone(p) {
  if (!p) return '';
  const digits = String(p).replace(/\D/g, '');
  if (digits.startsWith('94') && digits.length === 11) {
    return '0' + digits.slice(2);
  }
  return digits;
}

/**
 * Fetch all available products.
 * @returns {Promise<Array>} List of product objects
 */
export async function getProducts() {
  if (API_BASE_URL) {
    const res = await fetch(`${API_BASE_URL}/products`);
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error?.message || `Failed to fetch products: ${res.status}`);
    }
    return res.json();
  }

  // Local fallback
  return new Promise((resolve) => {
    resolve(Array.isArray(productsData) ? [...productsData] : []);
  });
}

/**
 * Fetch a single product by its unique ID.
 * @param {string} id Product ID
 * @returns {Promise<Object>} The product object
 */
export async function getProduct(id) {
  if (API_BASE_URL) {
    const res = await fetch(`${API_BASE_URL}/products/${encodeURIComponent(id)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error?.message || `Failed to fetch product ${id}: ${res.status}`);
    }
    return res.json();
  }

  // Local fallback
  return new Promise((resolve, reject) => {
    const product = productsData.find((p) => p.id === id);
    if (product) {
      resolve({ ...product });
    } else {
      reject(new Error(`Product not found: ${id}`));
    }
  });
}

/**
 * Fetch store configuration (shipping, payment methods, shop info).
 * @returns {Promise<Object>} Configuration object
 */
export async function getConfig() {
  if (API_BASE_URL) {
    const res = await fetch(`${API_BASE_URL}/config`);
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error?.message || `Failed to fetch configuration: ${res.status}`);
    }
    return res.json();
  }

  // Local fallback: return default configuration
  return new Promise((resolve) => {
    resolve(JSON.parse(JSON.stringify(defaultConfig)));
  });
}

/**
 * Submit a customer order.
 * 
 * Order payload contract:
 * {
 *   fulfillment: "post" | "pickup",
 *   customer: {
 *     name: string,
 *     phone: string,
 *     address?: string,     // Only when fulfillment === "post"
 *     city?: string,        // Only when fulfillment === "post"
 *     postalCode?: string,  // Only when fulfillment === "post"
 *     district?: string     // Only when fulfillment === "post"
 *   },
 *   paymentMethod: "cod" | "bank_transfer" | "pay_at_shop",
 *   items: [{ productId: string, size: string, quantity: number }],
 *   notes?: string
 * }
 * 
 * @param {Object} order
 * @returns {Promise<{
 *   reference: string,
 *   fulfillment: "post" | "pickup",
 *   status: string,
 *   paymentStatus: "unpaid" | "paid",
 *   subtotal: number,
 *   shippingFee: number,
 *   total: number,
 *   items: Array<{ productId: string, name: string, size: string, quantity: number, unitPrice: number }>,
 *   paymentMethod: string,
 *   bankTransferInstructions: string,
 *   createdAt: string
 * }>}
 */
export async function createOrder(order) {
  if (API_BASE_URL) {
    const res = await fetch(`${API_BASE_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(order)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error?.message || `Order creation failed: ${res.status}`);
    }

    return res.json();
  }

  // Local fallback: strict contract validation & computation
  return new Promise((resolve, reject) => {
    if (!order?.fulfillment || (order.fulfillment !== 'post' && order.fulfillment !== 'pickup')) {
      reject(new Error('Invalid fulfillment method. Must be "post" or "pickup".'));
      return;
    }

    if (!order?.customer?.name || !order?.customer?.phone) {
      reject(new Error('Customer name and phone number are required.'));
      return;
    }

    if (order.fulfillment === 'post') {
      if (!order.customer.address || !order.customer.city || !order.customer.postalCode || !order.customer.district) {
        reject(new Error('Postal delivery requires address, city, 5-digit postal code, and district.'));
        return;
      }
      if (order.paymentMethod === 'pay_at_shop') {
        reject(new Error('Pay at shop is only available with shop collection.'));
        return;
      }
    }

    if (order.fulfillment === 'pickup') {
      if (order.paymentMethod === 'cod') {
        reject(new Error('Cash on delivery is only available with postal delivery.'));
        return;
      }
    }

    if (!order?.items || !Array.isArray(order.items) || order.items.length === 0) {
      reject(new Error('Order items list cannot be empty.'));
      return;
    }

    // Server-side item lookup and price computation
    const enrichedItems = order.items.map((it) => {
      const product = productsData.find((p) => p.id === it.productId);
      const unitPrice = typeof product?.price === 'number' ? product.price : 0;
      return {
        productId: it.productId,
        name: product?.name || it.productId,
        size: it.size,
        quantity: Math.max(1, Number(it.quantity) || 1),
        unitPrice
      };
    });

    const subtotal = enrichedItems.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);

    // Calculate shipping fee based on config
    let shippingFee = 0;
    if (order.fulfillment === 'post') {
      const threshold = defaultConfig.freeShippingThreshold;
      if (typeof threshold === 'number' && subtotal >= threshold) {
        shippingFee = 0;
      } else {
        shippingFee = typeof defaultConfig.shippingFee === 'number' ? defaultConfig.shippingFee : 0;
      }
    }

    const total = subtotal + shippingFee;
    const reference = `TW-${Math.floor(100000 + Math.random() * 900000)}`;
    const createdAt = new Date().toISOString();

    const newOrder = {
      reference,
      fulfillment: order.fulfillment,
      status: 'pending',
      paymentStatus: 'unpaid',
      subtotal,
      shippingFee,
      total,
      customer: {
        name: order.customer.name,
        phone: order.customer.phone,
        ...(order.fulfillment === 'post' ? {
          address: order.customer.address,
          city: order.customer.city,
          postalCode: order.customer.postalCode,
          district: order.customer.district
        } : {})
      },
      paymentMethod: order.paymentMethod,
      items: enrichedItems,
      notes: order.notes || '',
      bankTransferInstructions: order.paymentMethod === 'bank_transfer' ? (defaultConfig.bankTransferInstructions || '') : '',
      createdAt,
      trackingNumber: null,
      trackingUrl: null,
      postedAt: null,
      readyAt: null,
      deliveredAt: null,
      collectedAt: null
    };

    try {
      const existing = JSON.parse(localStorage.getItem(ORDERS_STORAGE_KEY) || '[]');
      existing.unshift(newOrder);
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(existing));
    } catch {
      // LocalStorage error fallback
    }

    resolve({
      reference: newOrder.reference,
      fulfillment: newOrder.fulfillment,
      status: newOrder.status,
      paymentStatus: newOrder.paymentStatus,
      subtotal: newOrder.subtotal,
      shippingFee: newOrder.shippingFee,
      total: newOrder.total,
      items: newOrder.items,
      paymentMethod: newOrder.paymentMethod,
      bankTransferInstructions: newOrder.bankTransferInstructions,
      createdAt: newOrder.createdAt
    });
  });
}

/**
 * Retrieve tracking status for an order by reference and customer phone number.
 * @param {string} reference Order reference number (e.g., "TW-123456")
 * @param {string} phone Customer phone number for verification
 * @returns {Promise<Object|null>}
 */
export async function getOrderStatus(reference, phone = '') {
  const cleanRef = String(reference || '').trim().toUpperCase();

  if (API_BASE_URL) {
    const url = new URL(`${API_BASE_URL}/orders/${encodeURIComponent(cleanRef)}`);
    if (phone) {
      url.searchParams.set('phone', phone.trim());
    }
    const res = await fetch(url.toString());
    if (!res.ok) {
      if (res.status === 404) return null;
      const err = await res.json().catch(() => null);
      throw new Error(err?.error?.message || `Failed to fetch order status: ${res.status}`);
    }
    return res.json();
  }

  // Local fallback
  return new Promise((resolve) => {
    try {
      const existing = JSON.parse(localStorage.getItem(ORDERS_STORAGE_KEY) || '[]');
      const found = existing.find(
        (o) => String(o.reference || o.id || '').toUpperCase() === cleanRef
      );

      if (!found) {
        resolve(null);
        return;
      }

      // If phone is provided, verify match (Sri Lankan phone normalization)
      if (phone) {
        const orderPhoneNorm = normalizePhone(found.customer?.phone);
        const queryPhoneNorm = normalizePhone(phone);
        if (orderPhoneNorm !== queryPhoneNorm) {
          resolve(null);
          return;
        }
      }

      resolve({
        reference: found.reference || found.id,
        fulfillment: found.fulfillment || 'post',
        status: found.status || 'pending',
        paymentStatus: found.paymentStatus || 'unpaid',
        subtotal: found.subtotal || 0,
        shippingFee: found.shippingFee || 0,
        total: found.total || 0,
        items: found.items || [],
        paymentMethod: found.paymentMethod || 'cod',
        customer: found.customer || {},
        bankTransferInstructions: found.bankTransferInstructions || '',
        createdAt: found.createdAt || new Date().toISOString(),
        trackingNumber: found.trackingNumber || null,
        trackingUrl: found.trackingUrl || null,
        postedAt: found.postedAt || null,
        readyAt: found.readyAt || null,
        deliveredAt: found.deliveredAt || null,
        collectedAt: found.collectedAt || null
      });
    } catch {
      resolve(null);
    }
  });
}
