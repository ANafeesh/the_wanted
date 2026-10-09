import { Router } from 'express';
import { login, logout, getMe } from '../controllers/adminAuthController.js';
import {
  getAdminOrders,
  getAdminOrderByReference,
  updateOrderStatus,
  updateOrderPayment,
  updateOrderTracking,
  getOrderLabel
} from '../controllers/adminOrderController.js';
import {
  getAdminProducts,
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct
} from '../controllers/adminProductController.js';
import { getSettings, updateSettings } from '../controllers/adminSettingsController.js';
import { uploadMiddleware, uploadImage } from '../controllers/adminUploadController.js';
import { requireAdminAuth } from '../middleware/auth.js';
import { adminLoginRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Authentication
router.post('/login', adminLoginRateLimiter, login);
router.post('/logout', logout);
router.get('/me', requireAdminAuth, getMe);

// Orders management
router.get('/orders', requireAdminAuth, getAdminOrders);
router.get('/orders/:reference', requireAdminAuth, getAdminOrderByReference);
router.patch('/orders/:reference/status', requireAdminAuth, updateOrderStatus);
router.patch('/orders/:reference/payment', requireAdminAuth, updateOrderPayment);
router.patch('/orders/:reference/tracking', requireAdminAuth, updateOrderTracking);
router.get('/orders/:reference/label', requireAdminAuth, getOrderLabel);

// Products management
router.get('/products', requireAdminAuth, getAdminProducts);
router.post('/products', requireAdminAuth, createAdminProduct);
router.put('/products/:id', requireAdminAuth, updateAdminProduct);
router.delete('/products/:id', requireAdminAuth, deleteAdminProduct);

// Uploads
router.post('/upload', requireAdminAuth, uploadMiddleware, uploadImage);

// Settings
router.get('/settings', requireAdminAuth, getSettings);
router.put('/settings', requireAdminAuth, updateSettings);

export default router;
