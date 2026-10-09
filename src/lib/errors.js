/**
 * Application error class with standard HTTP status code and machine-readable error code.
 */
export class AppError extends Error {
  constructor(code, message, status = 400, fields = undefined) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    if (fields) {
      this.fields = fields;
    }
  }
}
