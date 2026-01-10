import sodium from 'libsodium-wrappers';

let isReady = false;

async function ensureReady(): Promise<void> {
  if (!isReady) {
    await sodium.ready;
    isReady = true;
  }
}

/**
 * Encrypts a token using libsodium secretbox (XSalsa20-Poly1305)
 * @param token - The plaintext token to encrypt
 * @returns Base64-encoded encrypted token (nonce + ciphertext)
 */
export async function encryptToken(token: string): Promise<string> {
  await ensureReady();

  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('TOKEN_ENCRYPTION_KEY not configured');
  }

  const keyBytes = sodium.from_base64(key);
  if (keyBytes.length !== sodium.crypto_secretbox_KEYBYTES) {
    throw new Error(
      `Invalid TOKEN_ENCRYPTION_KEY length. Expected ${sodium.crypto_secretbox_KEYBYTES} bytes, got ${keyBytes.length}`
    );
  }

  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const encrypted = sodium.crypto_secretbox_easy(
    sodium.from_string(token),
    nonce,
    keyBytes
  );

  // Combine nonce + ciphertext
  const combined = new Uint8Array(nonce.length + encrypted.length);
  combined.set(nonce);
  combined.set(encrypted, nonce.length);

  return sodium.to_base64(combined);
}

/**
 * Decrypts a token that was encrypted with encryptToken
 * @param encryptedData - Base64-encoded encrypted token
 * @returns The decrypted plaintext token
 */
export async function decryptToken(encryptedData: string): Promise<string> {
  await ensureReady();

  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('TOKEN_ENCRYPTION_KEY not configured');
  }

  const keyBytes = sodium.from_base64(key);
  if (keyBytes.length !== sodium.crypto_secretbox_KEYBYTES) {
    throw new Error(
      `Invalid TOKEN_ENCRYPTION_KEY length. Expected ${sodium.crypto_secretbox_KEYBYTES} bytes, got ${keyBytes.length}`
    );
  }

  const combined = sodium.from_base64(encryptedData);

  if (combined.length < sodium.crypto_secretbox_NONCEBYTES + sodium.crypto_secretbox_MACBYTES) {
    throw new Error('Invalid encrypted data: too short');
  }

  const nonce = combined.slice(0, sodium.crypto_secretbox_NONCEBYTES);
  const ciphertext = combined.slice(sodium.crypto_secretbox_NONCEBYTES);

  try {
    const decrypted = sodium.crypto_secretbox_open_easy(ciphertext, nonce, keyBytes);
    return sodium.to_string(decrypted);
  } catch {
    throw new Error('Decryption failed: invalid key or corrupted data');
  }
}

/**
 * Helper to generate a new encryption key (run once during setup)
 * Generate via: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 */
export function generateKeyHint(): string {
  return 'Run: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"';
}
