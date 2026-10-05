const encoder = new TextEncoder()

function toHex(bytes: ArrayBuffer | Uint8Array): string {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function createSalt(byteLength = 16): string {
  return toHex(crypto.getRandomValues(new Uint8Array(byteLength)))
}

/**
 * Salted SHA-256 via Web Crypto. This only keeps plaintext passwords out of localStorage
 * in the demo. A fast hash is NOT suitable for real password storage (use a backend with
 * bcrypt/argon2).
 */
export async function hashPassword(password: string, salt: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(`${salt}:${password}`))
  return toHex(digest)
}
