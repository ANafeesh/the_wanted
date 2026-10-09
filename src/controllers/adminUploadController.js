import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';
import sharp from 'sharp';
import { AppError } from '../lib/errors.js';

// Multer memory storage configured with 8 MB limit
export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024 // 8 MB
  }
}).single('image');

/**
 * Handle image upload: POST /admin/upload
 * Verifies real file type using Sharp, resizes to max 1200px wide, converts to WebP,
 * and saves in the /uploads directory.
 */
export async function uploadImage(req, res, next) {
  try {
    if (!req.file || !req.file.buffer) {
      throw new AppError('FILE_REQUIRED', 'Please upload an image file using the "image" form field', 400);
    }

    // Inspect real image format using Sharp metadata
    let metadata;
    try {
      metadata = await sharp(req.file.buffer).metadata();
    } catch {
      throw new AppError('INVALID_IMAGE', 'The uploaded file could not be parsed as a valid image', 400);
    }

    const allowedFormats = ['jpeg', 'png', 'webp'];
    if (!metadata || !allowedFormats.includes(metadata.format)) {
      throw new AppError(
        'INVALID_FILE_TYPE',
        `Unsupported image format "${metadata?.format || 'unknown'}". Allowed formats: JPG, PNG, WebP`,
        400
      );
    }

    // Resize to max 1200px wide without enlarging, and convert to WebP
    const webpBuffer = await sharp(req.file.buffer)
      .resize({
        width: 1200,
        withoutEnlargement: true
      })
      .webp({ quality: 82 })
      .toBuffer();

    // Ensure uploads directory exists
    const uploadsDir = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      await fs.promises.mkdir(uploadsDir, { recursive: true });
    }

    // Save with a random unique filename
    const filename = `${crypto.randomUUID()}.webp`;
    const destinationPath = path.join(uploadsDir, filename);

    await fs.promises.writeFile(destinationPath, webpBuffer);

    return res.status(201).json({
      filename,
      url: `/uploads/${filename}`
    });
  } catch (err) {
    next(err);
  }
}
