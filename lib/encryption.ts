import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } from 'tweetnacl-util';

/**
 * Encrypts a token using NaCl secretbox (XSalsa20-Poly1305)
 * @param token - The plaintext token to encrypt
 * @returns Base64-encoded encrypted token (nonce + ciphertext)
 */
export async function encryptToken(token: string): Promise<string> {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('TOKEN_ENCRYPTION_KEY not configured');
  }

  const keyBytes = decodeBase64(key);
  if (keyBytes.length !== nacl.secretbox.keyLength) {
    throw new Error(
      `Invalid TOKEN_ENCRYPTION_KEY length. Expected ${nacl.secretbox.keyLength} bytes, got ${keyBytes.length}`
    );
  }

  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const messageBytes = decodeUTF8(token);
  const encrypted = nacl.secretbox(messageBytes, nonce, keyBytes);

  // Combine nonce + ciphertext
  const combined = new Uint8Array(nonce.length + encrypted.length);
  combined.set(nonce);
  combined.set(encrypted, nonce.length);

  return encodeBase64(combined);
}

/**
 * Decrypts a token that was encrypted with encryptToken
 * @param encryptedData - Base64-encoded encrypted token
 * @returns The decrypted plaintext token
 */
export async function decryptToken(encryptedData: string): Promise<string> {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('TOKEN_ENCRYPTION_KEY not configured');
  }

  const keyBytes = decodeBase64(key);
  if (keyBytes.length !== nacl.secretbox.keyLength) {
    throw new Error(
      `Invalid TOKEN_ENCRYPTION_KEY length. Expected ${nacl.secretbox.keyLength} bytes, got ${keyBytes.length}`
    );
  }

  const combined = decodeBase64(encryptedData);

  if (combined.length < nacl.secretbox.nonceLength + nacl.secretbox.overheadLength) {
    throw new Error('Invalid encrypted data: too short');
  }

  const nonce = combined.slice(0, nacl.secretbox.nonceLength);
  const ciphertext = combined.slice(nacl.secretbox.nonceLength);

  const decrypted = nacl.secretbox.open(ciphertext, nonce, keyBytes);
  if (!decrypted) {
    throw new Error('Decryption failed: invalid key or corrupted data');
  }

  return encodeUTF8(decrypted);
}

/**
 * Helper to generate a new encryption key (run once during setup)
 * Generate via: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 */
export function generateKeyHint(): string {
  return 'Run: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"';
}
