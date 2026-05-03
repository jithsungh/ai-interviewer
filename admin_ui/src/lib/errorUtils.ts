/**
 * Error utilities for consistent error message extraction
 */

export interface ErrorResponse {
  message?: string;
  error?: string;
  detail?: string;
  details?: string;
  msg?: string;
  statusText?: string;
}

/**
 * Extract a readable error message from various error types
 * @param error - The caught error (can be Error, object, string, etc.)
 * @param defaultMessage - Default message if no message can be extracted
 * @returns A readable error message string
 */
export function getErrorMessage(error: unknown, defaultMessage: string = 'An error occurred'): string {
  // If it's already a string, return it
  if (typeof error === 'string') {
    return error;
  }

  // If it's an Error instance
  if (error instanceof Error) {
    // Check if it's a validation error with details
    if (error.message && error.message.length > 0) {
      return error.message;
    }
    return error.toString();
  }

  // If it's an object, try common error property names
  if (typeof error === 'object' && error !== null) {
    const err = error as ErrorResponse & { [key: string]: any };

    // Try common error property names in order
    if (err.message && typeof err.message === 'string' && err.message.length > 0) {
      return err.message;
    }

    if (err.error && typeof err.error === 'string' && err.error.length > 0) {
      return err.error;
    }

    if (err.detail && typeof err.detail === 'string' && err.detail.length > 0) {
      return err.detail;
    }

    if (err.details && typeof err.details === 'string' && err.details.length > 0) {
      return err.details;
    }

    if (err.msg && typeof err.msg === 'string' && err.msg.length > 0) {
      return err.msg;
    }

    if (err.statusText && typeof err.statusText === 'string' && err.statusText.length > 0) {
      return err.statusText;
    }

    // If the error is an object but has no readable message, stringify it carefully
    try {
      const str = JSON.stringify(err);
      if (str && str !== '{}' && str !== '[]') {
        return str;
      }
    } catch {
      // Ignore JSON stringify errors
    }
  }

  // Fallback to default message
  return defaultMessage;
}

/**
 * Log error for debugging
 * @param context - Context/location of the error
 * @param error - The error object
 */
export function logError(context: string, error: unknown): void {
  const message = getErrorMessage(error);
  console.error(`[${context}]`, {
    message,
    error,
    timestamp: new Date().toISOString(),
  });
}
