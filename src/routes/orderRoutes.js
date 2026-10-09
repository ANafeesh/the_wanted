import { Router } from 'express';
import { createOrder, getOrderTracking } from '../controllers/orderController.js';
import { orderCreateRateLimiter, orderTrackingRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/', orderCreateRateLimiter, createOrder);
router.get('/:reference', orderTrackingRateLimiter, getOrderTracking);

export default router;
