import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

/**
 * Central error handling middleware.
 * Ensures consistent response format: { error: { code, message, fields? } }
 * Never leaks stack traces or database internals.
 */
export function errorHandler(err, req, res, next) {
  // If response headers already sent, delegate to default express error handler
  if (res.headersSent) {
    return next(err);
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const fields = {};
    for (const issue of err.issues) {
      const fieldPath = issue.path.join('.') || 'general';
      if (!fields[fieldPath]) {
        fields[fieldPath] = issue.message;
      }
    }
    return res.status(400).json({
      error: {
        code: 'INVALID_INPUT',
        message: 'Validation failed',
        fields
      }
    });
  }

  // Handle known application errors
  if (err instanceof AppError) {
    const errorBody = {
      code: err.code,
      message: err.message
    };
    if (err.fields) {
      errorBody.fields = err.fields;
    }
    return res.status(err.status).json({
      error: errorBody
    });
  }

  // Handle invalid JSON body parsing errors
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'Malformed JSON payload'
      }
    });
  }

  // Handle Multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: {
        code: 'FILE_TOO_LARGE',
        message: 'Uploaded file exceeds the 8 MB size limit'
      }
    });
  }

  // Central log for unexpected errors (privacy sanitized)
  logger.error('Unhandled internal server error', {
    message: err.message,
    path: req.originalUrl,
    method: req.method
  });

  // Never expose raw database or code internals to client
  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An internal server error occurred'
    }
  });
}
