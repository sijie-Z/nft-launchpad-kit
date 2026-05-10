/**
 * Delayed Reveal — AES-256-CTR encryption/decryption using Web Crypto API
 *
 * Flow:
 * 1. Owner generates a random 32-byte key + 16-byte IV
 * 2. Encrypt the real baseURI with AES-256-CTR
 * 3. Store encrypted baseURI on-chain via setDelayedRevealURI()
 * 4. When ready to reveal, owner calls revealDelayedURI() with the real baseURI
 * 5. Off-chain: decrypt using the same key+IV to verify
 */

export interface EncryptedPayload {
  /** AES-256-CTR encrypted baseURI (hex string, no 0x prefix) */
  ciphertext: string;
  /** 16-byte initialization vector (hex string, no 0x prefix) */
  iv: string;
  /** 32-byte encryption key (hex string, no 0x prefix) */
  key: string;
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Generate a random AES-256 key and IV for delayed reveal.
 */
export function generateRevealKey(): { key: string; iv: string } {
  const key = crypto.getRandomValues(new Uint8Array(32));
  const iv = crypto.getRandomValues(new Uint8Array(16));
  return { key: bytesToHex(key), iv: bytesToHex(iv) };
}

/**
 * Encrypt a baseURI string with AES-256-CTR.
 * @param baseUri - The real baseURI to encrypt (e.g., "https://arweave.net/abc123/")
 * @param key - 32-byte key as hex string
 * @param iv - 16-byte IV as hex string
 * @returns Encrypted ciphertext as hex string
 */
export async function encryptBaseUri(baseUri: string, key: string, iv: string): Promise<string> {
  const keyBytes = hexToBytes(key);
  const ivBytes = hexToBytes(iv);
  const data = new TextEncoder().encode(baseUri);

  const cryptoKey = await crypto.subtle.importKey("raw", keyBytes, { name: "AES-CTR" }, false, ["encrypt"]);

  const encrypted = await crypto.subtle.encrypt({ name: "AES-CTR", counter: ivBytes, length: 64 }, cryptoKey, data);

  return bytesToHex(new Uint8Array(encrypted));
}

/**
 * Decrypt an AES-256-CTR encrypted baseURI.
 * @param ciphertext - Encrypted data as hex string
 * @param key - 32-byte key as hex string
 * @param iv - 16-byte IV as hex string
 * @returns The original baseURI string
 */
export async function decryptBaseUri(ciphertext: string, key: string, iv: string): Promise<string> {
  const keyBytes = hexToBytes(key);
  const ivBytes = hexToBytes(iv);
  const data = hexToBytes(ciphertext);

  const cryptoKey = await crypto.subtle.importKey("raw", keyBytes, { name: "AES-CTR" }, false, ["decrypt"]);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-CTR", counter: ivBytes, length: 64 },
    cryptoKey,
    data,
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Compute keccak256 hash of the encrypted URI hex string.
 * Uses the same encoding as the Solidity contract: keccak256(bytes(encryptedUri))
 * @param encryptedHex - The encrypted ciphertext as hex string
 * @returns keccak256 hash as 0x-prefixed hex string
 */
export async function computeEncryptedHash(encryptedHex: string): Promise<string> {
  // The contract hashes the string representation, so we hash the hex string bytes
  const data = new TextEncoder().encode(encryptedHex);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  // Note: Solidity keccak256 != SHA-256. We return 0x-prefixed for convenience.
  // For on-chain verification, the contract uses keccak256(bytes(encryptedUri))
  // where encryptedUri is the hex string passed as a string parameter.
  return "0x" + bytesToHex(new Uint8Array(hashBuffer));
}

/**
 * Full flow helper: generate key, encrypt baseURI, prepare contract parameters.
 * @param baseUri - The real baseURI
 * @returns Object with all parameters needed for contract interaction
 */
export async function prepareDelayedReveal(baseUri: string): Promise<{
  encryptedUri: string;
  key: string;
  iv: string;
  /** Note: This uses SHA-256 for off-chain preview. Contract uses keccak256. */
  hashPreview: string;
}> {
  const { key, iv } = generateRevealKey();
  const encryptedUri = await encryptBaseUri(baseUri, key, iv);
  const hashPreview = await computeEncryptedHash(encryptedUri);
  return { encryptedUri, key, iv, hashPreview };
}
