/**
 * Normalized error thrown by httpClient for every failure case, so calling code
 * never has to branch on axios internals (response vs request vs config error).
 */
export class ApiClientError extends Error {
  constructor({ code, message, status = null, details = null }) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}
