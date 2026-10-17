/**
 * Client-Side End-to-End Cryptography for Oneiric Sync
 *
 * Uses the Web Crypto API standard (window.crypto.subtle):
 * - Key Derivation: PBKDF2 with 100,000 SHA-256 iterations
 * - Encryption: Authenticated AES-GCM (256-bit key length, 128-bit authentication tag)
 * - Zero plaintext data ever transmitted to network or relays
 */

const CELESTIAL_WORDS = [
  'astral', 'lucid', 'aurora', 'starlight', 'nebula', 'cosmos',
  'velvet', 'echo', 'prism', 'vortex', 'silver', 'zenith',
  'solstice', 'mirage', 'whisper', 'eclipse', 'comet', 'nocturne',
  'galaxy', 'shadow', 'radian', 'orbit', 'meteor', 'lunar',
  'stellar', 'chronos', 'horizon', 'solitude', 'aether', 'cascade',
  'cipher', 'crystal', 'dreamer', 'ember', 'glyph', 'infinity',
  'mystic', 'obsidian', 'oasis', 'phantom', 'pulsar', 'quasar',
  'resonance', 'siren', 'solace', 'spectrum', 'spiral', 'talisman',
  'twilight', 'umbra', 'valiant', 'vivid', 'wanderer', 'zenith',
  'breeze', 'cradle', 'feather', 'glimmer', 'haven', 'journey',
  'passage', 'seraph', 'trance', 'voyage'
];

function getSubtleCrypto(): SubtleCrypto {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
    return globalThis.crypto.subtle;
  }
  throw new Error('Web Crypto API is not available in this environment.');
}

function getRandomValues<T extends Uint8Array>(array: T): T {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return globalThis.crypto.getRandomValues(array as unknown as ArrayBufferView<ArrayBuffer>) as unknown as T;
  }
  throw new Error('Cryptographically secure random number generator is unavailable.');
}

export const cryptoService = {
  /**
   * Generates a 6-word mnemonic passphrase (e.g. "lucid-nebula-starlight-aurora-velvet-prism")
   */
  generatePassphrase(): string {
    const bytes = new Uint8Array(6);
    getRandomValues(bytes);
    const words: string[] = [];
    for (let i = 0; i < 6; i++) {
      const index = bytes[i] % CELESTIAL_WORDS.length;
      words.push(CELESTIAL_WORDS[index]);
    }
    return words.join('-');
  },

  /**
   * Convert byte array to hex string
   */
  toHex(buffer: Uint8Array): string {
    return Array.from(buffer)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  },

  /**
   * Convert hex string to byte array
   */
  fromHex(hex: string): Uint8Array {
    if (hex.length % 2 !== 0) {
      throw new Error('Invalid hex string length');
    }
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
    }
    return bytes;
  },

  /**
   * Convert byte array to base64 string
   */
  toBase64(buffer: Uint8Array): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  },

  /**
   * Convert base64 string to byte array
   */
  fromBase64(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  },

  /**
   * Derives a 256-bit AES-GCM key from passphrase and salt using PBKDF2
   */
  async deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
    const subtle = getSubtleCrypto();
    const enc = new TextEncoder();
    const normalizedPass = passphrase.trim();

    const keyMaterial = await subtle.importKey(
      'raw',
      enc.encode(normalizedPass),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt as BufferSource,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  },

  /**
   * Encrypts arbitrary serializable data using AES-GCM 256-bit
   */
  async encryptData<T>(
    data: T,
    passphrase: string
  ): Promise<{ ciphertext: string; salt: string; iv: string }> {
    const subtle = getSubtleCrypto();
    const enc = new TextEncoder();
    const jsonString = JSON.stringify(data);

    // 16-byte random salt for PBKDF2
    const saltBytes = new Uint8Array(16);
    getRandomValues(saltBytes);

    // 12-byte random IV for AES-GCM
    const ivBytes = new Uint8Array(12);
    getRandomValues(ivBytes);

    const aesKey = await this.deriveKey(passphrase, saltBytes);

    const ciphertextBuffer = await subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: ivBytes as BufferSource,
      },
      aesKey,
      enc.encode(jsonString)
    );

    return {
      ciphertext: this.toBase64(new Uint8Array(ciphertextBuffer)),
      salt: this.toHex(saltBytes),
      iv: this.toHex(ivBytes),
    };
  },

  /**
   * Decrypts ciphertext and verifies integrity using AES-GCM
   */
  async decryptData<T>(
    envelope: { ciphertext: string; salt: string; iv: string },
    passphrase: string
  ): Promise<T> {
    const subtle = getSubtleCrypto();
    const dec = new TextDecoder();

    const saltBytes = this.fromHex(envelope.salt);
    const ivBytes = this.fromHex(envelope.iv);
    const ciphertextBytes = this.fromBase64(envelope.ciphertext);

    const aesKey = await this.deriveKey(passphrase, saltBytes);

    try {
      const decryptedBuffer = await subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: ivBytes as BufferSource,
        },
        aesKey,
        ciphertextBytes as BufferSource
      );

      const jsonStr = dec.decode(decryptedBuffer);
      return JSON.parse(jsonStr) as T;
    } catch {
      throw new Error(
        'Decryption failed. The encryption passphrase may be incorrect, or the sync data was modified/tampered with.'
      );
    }
  },

  /**
   * Formats a single unified sync key string for easy copy-pasting between devices.
   * Format: ONR-SYNC-{vaultId}::{passphrase}
   */
  formatUnifiedSyncKey(vaultId: string, passphrase: string): string {
    return `ONR-SYNC-${vaultId.trim()}::${passphrase.trim()}`;
  },

  /**
   * Parses either a unified sync key or separated inputs.
   */
  parseUnifiedSyncKey(input: string): { vaultId: string; passphrase: string } | null {
    if (!input || typeof input !== 'string') return null;
    const trimmed = input.trim();

    // Check for standard ONR-SYNC- prefix
    if (trimmed.startsWith('ONR-SYNC-')) {
      const body = trimmed.replace('ONR-SYNC-', '');
      const parts = body.split('::');
      if (parts.length === 2 && parts[0].trim() && parts[1].trim()) {
        return {
          vaultId: parts[0].trim(),
          passphrase: parts[1].trim(),
        };
      }
    }

    // Check for vaultId::passphrase or vaultId#passphrase
    const delimiter = trimmed.includes('::') ? '::' : trimmed.includes('#') ? '#' : null;
    if (delimiter) {
      const parts = trimmed.split(delimiter);
      if (parts.length === 2 && parts[0].trim() && parts[1].trim()) {
        return {
          vaultId: parts[0].trim(),
          passphrase: parts[1].trim(),
        };
      }
    }

    return null;
  },
};
