import rateLimit from 'express-rate-limit';

const isTest = process.env.NODE_ENV === 'test';

const rateLimitResponse = (message) => (req, res) => {
  res.status(429).json({
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message
    }
  });
};

/**
 * Rate limit for order creation: 10 per hour per IP.
 */
export const orderCreateRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  skip: () => isTest,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitResponse('Too many orders placed from this IP. Please try again later.')
});

/**
 * Rate limit for order tracking: 20 per 15 minutes per IP.
 */
export const orderTrackingRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  skip: () => isTest,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitResponse('Too many order lookup attempts. Please try again in 15 minutes.')
});

/**
 * Rate limit for admin login: 5 per 15 minutes per IP.
 */
export const adminLoginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skip: () => isTest,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitResponse('Too many login attempts. Please try again in 15 minutes.')
});

/**
 * General rate limit for all other requests: 300 per 15 minutes per IP.
 */
export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  skip: () => isTest,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitResponse('Too many requests. Please try again later.')
});
