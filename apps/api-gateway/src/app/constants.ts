/**
 * App-level constants read from environment variables.
 * Add entries to .env.debug / .env.release to override defaults.
 */
export const DEFAULT_CURRENCY: string = process.env['DEFAULT_CURRENCY'] ?? 'mxn';
export const QR_CODE_PREFIX: string = process.env['QR_CODE_PREFIX'] ?? 'LGN';
