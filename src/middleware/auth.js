import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';

/**
 * Authentication middleware for admin routes.
 * Checks httpOnly cookie (admin_token) or Bearer token header.
 */
export async function requireAdminAuth(req, res, next) {
  try {
    const token =
      req.cookies?.admin_token ||
      req.cookies?.token ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice(7).trim()
        : null);

    if (!token) {
      throw new AppError('UNAUTHORIZED', 'Authentication required', 401);
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new AppError('INTERNAL_SERVER_ERROR', 'Authentication configuration error', 500);
    }

    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch {
      throw new AppError('UNAUTHORIZED', 'Invalid or expired token', 401);
    }

    if (!decoded || !decoded.id) {
      throw new AppError('UNAUTHORIZED', 'Invalid token payload', 401);
    }

    const admin = await prisma.adminUser.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, createdAt: true }
    });

    if (!admin) {
      throw new AppError('UNAUTHORIZED', 'Admin account no longer exists', 401);
    }

    req.admin = admin;
    next();
  } catch (err) {
    next(err);
  }
}
