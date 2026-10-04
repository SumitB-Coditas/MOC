export type AppErrorCode =
  | 'STORAGE_UNAVAILABLE'
  | 'STORAGE_FULL'
  | 'STORAGE_CORRUPTED'
  | 'STORAGE_VERSION_UNSUPPORTED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'UNKNOWN'

interface AppErrorOptions {
  /** Per-field messages, mapped onto form fields by the UI. */
  fieldErrors?: Record<string, string>
  cause?: unknown
}

/**
 * The single error type thrown by services. Mirrors what a REST API error body would carry,
 * so the UI handles local and remote failures the same way.
 */
export class AppError extends Error {
  readonly code: AppErrorCode
  readonly fieldErrors?: Record<string, string>

  constructor(code: AppErrorCode, message: string, options: AppErrorOptions = {}) {
    super(message, { cause: options.cause })
    this.name = 'AppError'
    this.code = code
    this.fieldErrors = options.fieldErrors
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}
