import { describe, it, expect } from 'vitest';
import { cryptoService } from '../services/cryptoService';

describe('cryptoService - End-to-End Encryption', () => {
  it('generates a 6-word celestial passphrase', () => {
    const pass = cryptoService.generatePassphrase();
    expect(pass).toBeDefined();
    const words = pass.split('-');
    expect(words.length).toBe(6);
    expect(words.every((w) => w.length > 2)).toBe(true);
  });

  it('encrypts and decrypts arbitrary payload accurately', async () => {
    const passphrase = 'astral-lucid-starlight-nebula-aurora-velvet';
    const original = {
      dreams: [
        { id: 'dream-1', title: 'Lucid flight over mountains', lucidity: 'lucid' },
        { id: 'dream-2', title: 'Ancient library in the sky', lucidity: 'non-lucid' },
      ],
      timestamp: '2026-10-17T12:00:00.000Z',
    };

    const encrypted = await cryptoService.encryptData(original, passphrase);
    expect(encrypted.ciphertext).toBeTruthy();
    expect(encrypted.salt).toBeTruthy();
    expect(encrypted.iv).toBeTruthy();

    const decrypted = await cryptoService.decryptData<typeof original>(encrypted, passphrase);
    expect(decrypted).toEqual(original);
  });

  it('rejects decryption when wrong passphrase is provided', async () => {
    const correctPass = 'astral-lucid-starlight-nebula-aurora-velvet';
    const wrongPass = 'astral-lucid-starlight-nebula-aurora-wrongword';
    const payload = { secret: 'flying high' };

    const encrypted = await cryptoService.encryptData(payload, correctPass);
    await expect(cryptoService.decryptData(encrypted, wrongPass)).rejects.toThrow(
      /Decryption failed/i
    );
  });

  it('rejects decryption when ciphertext is tampered with', async () => {
    const pass = 'astral-lucid-starlight-nebula-aurora-velvet';
    const payload = { secret: 'untampered' };

    const encrypted = await cryptoService.encryptData(payload, pass);
    // Tamper ciphertext
    const tampered = {
      ...encrypted,
      ciphertext: encrypted.ciphertext.slice(0, -4) + 'AAAA',
    };

    await expect(cryptoService.decryptData(tampered, pass)).rejects.toThrow(
      /Decryption failed/i
    );
  });

  it('formats and parses unified sync keys correctly', () => {
    const vaultId = 'ddcbcaa';
    const passphrase = 'astral-lucid-starlight-nebula-aurora-velvet';
    const unified = cryptoService.formatUnifiedSyncKey(vaultId, passphrase);

    expect(unified).toBe(`ONR-SYNC-${vaultId}::${passphrase}`);

    const parsed = cryptoService.parseUnifiedSyncKey(unified);
    expect(parsed).toEqual({ vaultId, passphrase });

    // Also support hash delimiter
    const parsedHash = cryptoService.parseUnifiedSyncKey(`${vaultId}#${passphrase}`);
    expect(parsedHash).toEqual({ vaultId, passphrase });

    // Invalid string
    expect(cryptoService.parseUnifiedSyncKey('invalid-sync-key')).toBeNull();
  });
});
