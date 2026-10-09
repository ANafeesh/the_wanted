import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { adminLoginSchema } from '../validators/adminValidator.js';
import { AppError } from '../lib/errors.js';

/**
 * Admin login: POST /admin/login
 * Validates credentials and sets signed JWT in an httpOnly cookie (8 hours).
 */
export async function login(req, res, next) {
  try {
    const validated = adminLoginSchema.parse(req.body);

    const admin = await prisma.adminUser.findUnique({
      where: { email: validated.email.toLowerCase().trim() }
    });

    if (!admin) {
      throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
    }

    const passwordMatches = await bcrypt.compare(validated.password, admin.passwordHash);
    if (!passwordMatches) {
      throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
    }

    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
      throw new AppError('INTERNAL_SERVER_ERROR', 'JWT configuration error', 500);
    }

    const token = jwt.sign(
      { id: admin.id, email: admin.email },
      secret,
      { expiresIn: '8h' }
    );

    // Set signed JWT in an httpOnly cookie (sameSite lax, secure in production, 8 hours)
    res.cookie('admin_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 8 * 60 * 60 * 1000
    });

    return res.json({
      message: 'Logged in successfully',
      admin: {
        email: admin.email
      },
      token
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin logout: POST /admin/logout
 * Clears authentication cookie.
 */
export async function logout(req, res, next) {
  try {
    res.clearCookie('admin_token', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });

    return res.json({
      message: 'Logged out successfully'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get current admin: GET /admin/me
 */
export async function getMe(req, res, next) {
  try {
    return res.json({
      admin: {
        email: req.admin.email
      }
    });
  } catch (err) {
    next(err);
  }
}
