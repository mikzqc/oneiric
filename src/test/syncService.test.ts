import { describe, it, expect, beforeEach, vi } from 'vitest';
import { syncService } from '../services/syncService';
import { db } from '../db/database';
import { DreamEntry } from '../types/dream';

describe('syncService - Multi-Device Cloud Sync', () => {
  beforeEach(async () => {
    localStorage.clear();
    await db.dreams.clear();
    await db.techniqueLogs.clear();
    await db.customTags.clear();
    await db.dreamSigns.clear();
    vi.restoreAllMocks();
  });

  it('manages vault credentials in localStorage cleanly', () => {
    expect(syncService.isConfigured()).toBe(false);
    expect(syncService.getCredentials()).toBeNull();

    const mockCreds = {
      vaultId: 'test-vault-123',
      passphrase: 'astral-lucid-starlight-nebula-aurora-velvet',
      createdAt: '2026-10-17T12:00:00Z',
      autoSync: true,
    };

    syncService.saveCredentials(mockCreds);
    expect(syncService.isConfigured()).toBe(true);

    const saved = syncService.getCredentials();
    expect(saved?.vaultId).toBe('test-vault-123');
    expect(saved?.passphrase).toBe('astral-lucid-starlight-nebula-aurora-velvet');

    syncService.clearCredentials();
    expect(syncService.isConfigured()).toBe(false);
    expect(syncService.getCredentials()).toBeNull();
  });

  it('exports and imports direct encrypted transfer packages', async () => {
    const sampleDream: DreamEntry = {
      id: 'dream-sync-test',
      title: 'City of Glass',
      narrative: 'Walking across crystalline bridges suspended over a quiet ocean.',
      date: '2026-10-17',
      lucidity: 'lucid',
      vividness: 5,
      dreamControl: 4,
      emotions: ['wonder'],
      tags: ['flying', 'city'],
      createdAt: '2026-10-17T10:00:00Z',
      updatedAt: '2026-10-17T10:00:00Z',
    };
    await db.dreams.add(sampleDream);

    // Export encrypted transfer code
    const { code, passphrase } = await syncService.exportEncryptedTransferCode();
    expect(code).toBeTruthy();
    expect(passphrase).toBeTruthy();

    // Clear local db to simulate second device
    await db.dreams.clear();
    expect(await db.dreams.count()).toBe(0);

    // Import into second device
    const importedCount = await syncService.importEncryptedTransferCode(code, passphrase);
    expect(importedCount).toBe(1);

    const found = await db.dreams.get('dream-sync-test');
    expect(found).toBeDefined();
    expect(found?.title).toBe('City of Glass');
    expect(found?.lucidity).toBe('lucid');
  });

  it('performs end-to-end sync workflow with cloud relay mock', async () => {
    // 1. Setup local dream
    const dream1: DreamEntry = {
      id: 'device-a-dream',
      title: 'Neon Nebula',
      narrative: 'Floating inside a celestial gas cloud with neon violet hues.',
      date: '2026-10-17',
      lucidity: 'lucid',
      createdAt: '2026-10-17T09:00:00Z',
      updatedAt: '2026-10-17T09:00:00Z',
    };
    await db.dreams.add(dream1);

    // Mock cloud relay storage
    let cloudStore: Record<string, unknown> = {};

    globalThis.fetch = vi.fn().mockImplementation(async (url: string, options?: RequestInit) => {
      const method = options?.method || 'GET';
      if (method === 'POST') {
        const body = JSON.parse(options?.body as string);
        const id = 'mock-vault-789';
        cloudStore[id] = body;
        return {
          ok: true,
          status: 201,
          json: async () => ({ id }),
        };
      }
      if (method === 'GET') {
        const id = url.includes('id=')
          ? new URL(url, 'http://localhost').searchParams.get('id') || ''
          : url.split('/').pop() || '';
        if (!cloudStore[id]) {
          return { ok: false, status: 404, json: async () => ({}) };
        }
        return {
          ok: true,
          status: 200,
          json: async () => cloudStore[id],
        };
      }
      if (method === 'PUT') {
        const id = url.includes('id=')
          ? new URL(url, 'http://localhost').searchParams.get('id') || ''
          : url.split('/').pop() || '';
        const body = JSON.parse(options?.body as string);
        cloudStore[id] = body;
        return {
          ok: true,
          status: 200,
          json: async () => ({ status: 0 }),
        };
      }
      return { ok: false, status: 400 };
    }) as unknown as typeof fetch;

    // 2. Create vault on Device A
    const { vaultId, passphrase, unifiedKey } = await syncService.createVault({
      passphrase: 'celestial-lucid-starlight-nebula-aurora-velvet',
    });

    expect(vaultId).toBe('mock-vault-789');
    expect(unifiedKey).toContain('ONR-SYNC-mock-vault-789::');

    // 3. Simulate Device B: clear local IndexedDB and credentials
    await db.dreams.clear();
    syncService.clearCredentials();
    expect(await db.dreams.count()).toBe(0);

    // Device B has its own unique dream before connecting
    const dream2: DreamEntry = {
      id: 'device-b-dream',
      title: 'Submerged Sanctuary',
      narrative: 'Deep breath underwater discovering an ancient sunken temple.',
      date: '2026-10-17',
      lucidity: 'uncertain',
      createdAt: '2026-10-17T11:00:00Z',
      updatedAt: '2026-10-17T11:00:00Z',
    };
    await db.dreams.add(dream2);

    // 4. Device B connects using unified sync key
    const connectResult = await syncService.connectVault(unifiedKey);
    expect(connectResult.success).toBe(true);

    // Device B now has BOTH dreams (dream1 pulled from vault, dream2 preserved and pushed)
    const dreamsOnB = await db.dreams.toArray();
    expect(dreamsOnB.length).toBe(2);
    expect(dreamsOnB.some((d) => d.id === 'device-a-dream')).toBe(true);
    expect(dreamsOnB.some((d) => d.id === 'device-b-dream')).toBe(true);

    // 5. Simulate Device A syncing now to pull Device B's changes
    syncService.saveCredentials({
      vaultId,
      passphrase,
      createdAt: '2026-10-17T09:00:00Z',
      autoSync: true,
    });
    // Remove dream2 on Device A side to verify syncNow pulls it
    await db.dreams.delete('device-b-dream');
    expect(await db.dreams.count()).toBe(1);

    const syncNowRes = await syncService.syncNow();
    expect(syncNowRes.success).toBe(true);
    expect(await db.dreams.count()).toBe(2);
  });
});
