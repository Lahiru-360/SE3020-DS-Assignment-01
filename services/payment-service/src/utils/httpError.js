export class HttpError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'HttpError';
  }
}

export const createHttpError = (message, statusCode = 500) =>
  new HttpError(message, statusCode);
