import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { syncService } from '../services/syncService';
import { backupService } from '../services/backupService';
import { cryptoService } from '../services/cryptoService';
import { db } from '../db/database';
import { DreamEntry } from '../types/dream';
import { SyncSettingsCard } from '../components/sync/SyncSettingsCard';

describe('Synced Device Management & Credential Security Warnings', () => {
  beforeEach(async () => {
    localStorage.clear();
    await db.dreams.clear();
    await db.techniqueLogs.clear();
    await db.customTags.clear();
    await db.dreamSigns.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Device Registration & Identification', () => {
    it('initializes the creator device with stable ID, type, and active status', async () => {
      // Mock fetch for createVault
      globalThis.fetch = vi.fn().mockImplementation(async () => ({
        ok: true,
        status: 201,
        json: async () => ({ id: 'vault-alpha-123' }),
      }));

      const { vaultId } = await syncService.createVault({
        passphrase: 'astral-lucid-starlight-nebula-aurora-velvet',
        deviceName: 'MacBook Pro Workbench',
      });

      expect(vaultId).toBe('vault-alpha-123');
      const creds = syncService.getCredentials();
      expect(creds).not.toBeNull();
      expect(creds?.deviceId).toMatch(/^dev_/);
      expect(creds?.deviceName).toBe('MacBook Pro Workbench');
      expect(creds?.devices?.length).toBe(1);

      const creatorDevice = creds?.devices?.[0];
      expect(creatorDevice?.id).toBe(creds?.deviceId);
      expect(creatorDevice?.name).toBe('MacBook Pro Workbench');
      expect(creatorDevice?.status).toBe('active');
      expect(creatorDevice?.pairedAt).toBeTruthy();
      expect(creatorDevice?.lastSyncAt).toBeTruthy();
    });

    it('identifies and lists paired devices, distinguishing the current device', () => {
      const currentDeviceId = 'dev_laptop_111';
      const secondaryDeviceId = 'dev_mobile_222';
      const nowStr = new Date().toISOString();

      syncService.saveCredentials({
        vaultId: 'vault-devices-test',
        passphrase: 'celestial-lucid-orbit-mirage-whisper-velvet',
        createdAt: nowStr,
        autoSync: true,
        deviceId: currentDeviceId,
        deviceName: 'Workstation',
        deviceType: 'desktop',
        devices: [
          {
            id: currentDeviceId,
            name: 'Workstation',
            type: 'desktop',
            pairedAt: nowStr,
            lastSyncAt: nowStr,
            status: 'active',
          },
          {
            id: secondaryDeviceId,
            name: 'Nightstand iPhone',
            type: 'mobile',
            pairedAt: nowStr,
            lastSyncAt: nowStr,
            status: 'active',
          },
        ],
        revokedDeviceIds: [],
      });

      const devices = syncService.getConnectedDevices();
      expect(devices.length).toBe(2);

      const current = devices.find((d) => d.id === currentDeviceId);
      const secondary = devices.find((d) => d.id === secondaryDeviceId);

      expect(current?.name).toBe('Workstation');
      expect(current?.type).toBe('desktop');
      expect(secondary?.name).toBe('Nightstand iPhone');
      expect(secondary?.type).toBe('mobile');
    });

    it('accurately detects modern iPadOS devices as an iPad tablet even in desktop Safari mode', () => {
      // Modern iPadOS 13+ userAgent says Macintosh, but platform is MacIntel and maxTouchPoints > 1
      const originalUserAgent = navigator.userAgent;
      const originalPlatform = navigator.platform;
      const originalTouch = navigator.maxTouchPoints;

      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        configurable: true,
      });
      Object.defineProperty(navigator, 'platform', {
        value: 'MacIntel',
        configurable: true,
      });
      Object.defineProperty(navigator, 'maxTouchPoints', {
        value: 5,
        configurable: true,
      });

      const detected = syncService.getDeviceName();
      expect(detected).toBe('iPad');

      // Cleanup
      Object.defineProperty(navigator, 'userAgent', { value: originalUserAgent, configurable: true });
      Object.defineProperty(navigator, 'platform', { value: originalPlatform, configurable: true });
      Object.defineProperty(navigator, 'maxTouchPoints', { value: originalTouch, configurable: true });
    });

    it('auto-discovers existing devices from lastRemoteDevice so Oneiric already knows what is connected', () => {
      const nowStr = new Date().toISOString();

      // Simulate a user who had already synced an iPad in a previous version of Oneiric
      localStorage.setItem(
        'oneiric_sync_vault',
        JSON.stringify({
          vaultId: 'vault-legacy-test',
          passphrase: 'astral-lucid-starlight-nebula-aurora-velvet',
          createdAt: nowStr,
          lastSyncedAt: nowStr,
          autoSync: true,
          deviceName: 'Workstation PC',
          lastRemoteDevice: 'iPad',
          lastRemoteUpdate: nowStr,
        })
      );

      const creds = syncService.getCredentials();
      expect(creds?.devices).toBeDefined();
      // Should contain both this device and the known remote iPad
      expect(creds?.devices?.length).toBe(2);

      const iPad = creds?.devices?.find((d) => d.name === 'iPad');
      expect(iPad).toBeDefined();
      expect(iPad?.type).toBe('tablet');
      expect(iPad?.status).toBe('active');
    });

    it('preserves device identity and updates existing record when a device disconnects and reconnects', async () => {
      const nowStr = new Date().toISOString();
      let cloudStore: any = null;

      globalThis.fetch = vi.fn().mockImplementation(async (url: string, options?: RequestInit) => {
        const method = options?.method || 'GET';
        if (method === 'GET') {
          return {
            ok: true,
            status: 200,
            json: async () => cloudStore,
          };
        }
        if (method === 'PUT') {
          cloudStore = JSON.parse(options?.body as string);
          return { ok: true, status: 200, json: async () => ({ success: true }) };
        }
        return { ok: true, status: 201, json: async () => ({ id: 'vault-recon' }) };
      });

      // 1. Vault is created with initial PC and iPad
      const initialBackup = await backupService.exportData();
      const initialPayload = {
        ...initialBackup,
        devices: [
          {
            id: 'dev_pc_1',
            name: 'PC Desktop',
            type: 'desktop' as const,
            pairedAt: nowStr,
            lastSyncAt: nowStr,
            status: 'active' as const,
          },
          {
            id: 'dev_ipad_stable',
            name: 'iPad',
            type: 'tablet' as const,
            pairedAt: nowStr,
            lastSyncAt: nowStr,
            status: 'active' as const,
          },
        ],
        revokedDeviceIds: [],
      };
      const enc = await cryptoService.encryptData(initialPayload, 'astral-lucid-starlight-nebula-aurora-velvet');
      cloudStore = {
        version: 2,
        vaultId: 'vault-recon',
        salt: enc.salt,
        iv: enc.iv,
        ciphertext: enc.ciphertext,
        updatedAt: nowStr,
        devices: initialPayload.devices,
        revokedDeviceIds: [],
      };

      // 2. Simulate iPad connecting with deviceName 'iPad'
      localStorage.setItem('oneiric_device_name', 'iPad');
      await syncService.connectVault('vault-recon', 'astral-lucid-starlight-nebula-aurora-velvet', 'iPad');

      const creds1 = syncService.getCredentials();
      expect(creds1?.devices?.filter((d) => d.name === 'iPad').length).toBe(1);

      // 3. iPad disconnects
      syncService.clearCredentials();
      expect(syncService.isConfigured()).toBe(false);

      // 4. iPad reconnects
      await syncService.connectVault('vault-recon', 'astral-lucid-starlight-nebula-aurora-velvet', 'iPad');

      const creds2 = syncService.getCredentials();
      // Should STILL have exactly 2 devices (PC and iPad), not a duplicated 3rd device!
      expect(creds2?.devices?.length).toBe(2);
      expect(creds2?.devices?.filter((d) => d.name === 'iPad').length).toBe(1);
      const reconnectedIpad = creds2?.devices?.find((d) => d.name === 'iPad');
      expect(reconnectedIpad?.status).toBe('active');
    });
  });

  describe('Device Revocation & Security Enforcement', () => {
    it('successfully revokes a secondary device and updates the device registry', async () => {
      const currentDeviceId = 'dev_primary_001';
      const secondaryDeviceId = 'dev_phone_002';
      const nowStr = new Date().toISOString();

      let cloudStoredEnvelope: any = null;

      globalThis.fetch = vi.fn().mockImplementation(async (url: string, options?: RequestInit) => {
        const method = options?.method || 'GET';
        if (method === 'GET') {
          return {
            ok: true,
            status: 200,
            json: async () =>
              cloudStoredEnvelope || {
                version: 2,
                vaultId: 'vault-revoke-test',
                salt: 'abc',
                iv: 'def',
                ciphertext: 'mock',
                updatedAt: nowStr,
                devices: [],
                revokedDeviceIds: [],
              },
          };
        }
        if (method === 'PUT') {
          cloudStoredEnvelope = JSON.parse(options?.body as string);
          return {
            ok: true,
            status: 200,
            json: async () => ({ success: true }),
          };
        }
        return { ok: false, status: 400, json: async () => ({}) };
      });

      // Prepare local credentials with 2 devices
      syncService.saveCredentials({
        vaultId: 'vault-revoke-test',
        passphrase: 'astral-lucid-starlight-nebula-aurora-velvet',
        createdAt: nowStr,
        autoSync: true,
        deviceId: currentDeviceId,
        deviceName: 'Desktop PC',
        deviceType: 'desktop',
        devices: [
          {
            id: currentDeviceId,
            name: 'Desktop PC',
            type: 'desktop',
            pairedAt: nowStr,
            lastSyncAt: nowStr,
            status: 'active',
          },
          {
            id: secondaryDeviceId,
            name: 'Stolen Tablet',
            type: 'tablet',
            pairedAt: nowStr,
            lastSyncAt: nowStr,
            status: 'active',
          },
        ],
        revokedDeviceIds: [],
      });

      // Also prime cloud envelope
      const baseBackup = await backupService.exportData();
      const initialPayload = {
        ...baseBackup,
        devices: syncService.getCredentials()?.devices,
        revokedDeviceIds: [],
      };
      const initialEnc = await cryptoService.encryptData(
        initialPayload,
        'astral-lucid-starlight-nebula-aurora-velvet'
      );
      cloudStoredEnvelope = {
        version: 2,
        vaultId: 'vault-revoke-test',
        salt: initialEnc.salt,
        iv: initialEnc.iv,
        ciphertext: initialEnc.ciphertext,
        updatedAt: nowStr,
        devices: syncService.getCredentials()?.devices,
        revokedDeviceIds: [],
      };

      // Execute revocation of secondary device
      await syncService.revokeDevice(secondaryDeviceId);

      const updatedCreds = syncService.getCredentials();
      expect(updatedCreds?.revokedDeviceIds).toContain(secondaryDeviceId);

      // Device is revoked and completely disappears from the devices list
      const revokedDevice = updatedCreds?.devices?.find((d) => d.id === secondaryDeviceId);
      expect(revokedDevice).toBeUndefined();
      expect(updatedCreds?.devices?.length).toBe(1);

      // Verify cloud envelope also received the revocation list
      expect(cloudStoredEnvelope.revokedDeviceIds).toContain(secondaryDeviceId);
    });

    it('denies unauthorized revocation attempts (self-revocation and revoked callers)', async () => {
      const currentDeviceId = 'dev_primary_001';
      const nowStr = new Date().toISOString();

      syncService.saveCredentials({
        vaultId: 'vault-unauth-test',
        passphrase: 'astral-lucid-starlight-nebula-aurora-velvet',
        createdAt: nowStr,
        autoSync: true,
        deviceId: currentDeviceId,
        deviceName: 'Primary',
        devices: [
          {
            id: currentDeviceId,
            name: 'Primary',
            type: 'desktop',
            pairedAt: nowStr,
            lastSyncAt: nowStr,
            status: 'active',
          },
        ],
        revokedDeviceIds: [],
      });

      // 1. Attempting to revoke current device via revokeDevice must throw
      await expect(syncService.revokeDevice(currentDeviceId)).rejects.toThrow(
        /Cannot remove the current device from the device list/i
      );

      // 2. Caller device that is itself revoked cannot revoke other devices
      syncService.saveCredentials({
        vaultId: 'vault-unauth-test',
        passphrase: 'astral-lucid-starlight-nebula-aurora-velvet',
        createdAt: nowStr,
        autoSync: true,
        deviceId: currentDeviceId,
        deviceName: 'Primary',
        devices: [],
        revokedDeviceIds: [currentDeviceId], // marked revoked!
      });

      await expect(syncService.revokeDevice('dev_other_999')).rejects.toThrow(
        /Unauthorized: This device has been revoked/i
      );
    });

    it('denies future synchronization to revoked devices', async () => {
      const revokedDeviceId = 'dev_revoked_device';
      const nowStr = new Date().toISOString();

      // Configure local device as the revoked device
      syncService.saveCredentials({
        vaultId: 'vault-locked-out',
        passphrase: 'astral-lucid-starlight-nebula-aurora-velvet',
        createdAt: nowStr,
        autoSync: true,
        deviceId: revokedDeviceId,
        deviceName: 'Lost Mobile',
        devices: [
          {
            id: revokedDeviceId,
            name: 'Lost Mobile',
            type: 'mobile',
            pairedAt: nowStr,
            lastSyncAt: nowStr,
            status: 'revoked',
          },
        ],
        revokedDeviceIds: [revokedDeviceId],
      });

      // Attempting syncNow must be blocked immediately before network or on check
      await expect(syncService.syncNow()).rejects.toThrow(
        /Sync Access Revoked: This device has been removed from the sync vault/i
      );
    });

    it('persists already-downloaded local dream records safely upon revocation', async () => {
      const sampleDream: DreamEntry = {
        id: 'dream-offline-survivor',
        title: 'Luminescent Library',
        narrative: 'Infinite shelves of glowing ancient books suspended in the sky.',
        date: '2026-10-25',
        lucidity: 'lucid',
        createdAt: '2026-10-25T08:00:00Z',
        updatedAt: '2026-10-25T08:00:00Z',
      };
      await db.dreams.add(sampleDream);
      expect(await db.dreams.count()).toBe(1);

      // Even if sync is revoked, local database records must NEVER be wiped remotely
      const myDeviceId = 'dev_cut_off';
      syncService.saveCredentials({
        vaultId: 'vault-cut-off',
        passphrase: 'astral-lucid-starlight-nebula-aurora-velvet',
        createdAt: '2026-10-25T08:00:00Z',
        autoSync: true,
        deviceId: myDeviceId,
        devices: [],
        revokedDeviceIds: [myDeviceId],
      });

      // Sync fails
      await expect(syncService.syncNow()).rejects.toThrow(/Sync Access Revoked/i);

      // Local dream is still intact and accessible!
      const preserved = await db.dreams.get('dream-offline-survivor');
      expect(preserved).toBeDefined();
      expect(preserved?.title).toBe('Luminescent Library');
    });

    it('re-keys the vault to provide 100% cryptographic forward secrecy', async () => {
      const oldDeviceId = 'dev_old_device';
      const nowStr = new Date().toISOString();

      syncService.saveCredentials({
        vaultId: 'vault-old-slot',
        passphrase: 'old-passphrase-to-be-discarded',
        createdAt: nowStr,
        autoSync: true,
        deviceId: oldDeviceId,
        deviceName: 'Primary Desktop',
        devices: [
          {
            id: oldDeviceId,
            name: 'Primary Desktop',
            type: 'desktop',
            pairedAt: nowStr,
            lastSyncAt: nowStr,
            status: 'active',
          },
          {
            id: 'dev_compromised_device',
            name: 'Compromised Device',
            type: 'mobile',
            pairedAt: nowStr,
            lastSyncAt: nowStr,
            status: 'revoked',
          },
        ],
        revokedDeviceIds: ['dev_compromised_device'],
      });

      // Mock creating a new vault slot
      globalThis.fetch = vi.fn().mockImplementation(async () => ({
        ok: true,
        status: 201,
        json: async () => ({ id: 'vault-fresh-key-777' }),
      }));

      const res = await syncService.rotateVaultKey({
        newPassphrase: 'zenith-solstice-resonance-solace-cipher-glimmer',
      });

      expect(res.vaultId).toBe('vault-fresh-key-777');
      expect(res.passphrase).toBe('zenith-solstice-resonance-solace-cipher-glimmer');

      const freshCreds = syncService.getCredentials();
      expect(freshCreds?.vaultId).toBe('vault-fresh-key-777');
      expect(freshCreds?.passphrase).toBe('zenith-solstice-resonance-solace-cipher-glimmer');
      // Revoked device is completely excluded from the new vault's device list
      expect(freshCreds?.devices?.some((d) => d.id === 'dev_compromised_device')).toBe(false);
    });
  });

  describe('Sensitive Credential Disclaimers UI', () => {
    it('renders both credential disclaimers with the exact required text', async () => {
      syncService.saveCredentials({
        vaultId: 'vault-ui-test',
        passphrase: 'astral-lucid-starlight-nebula-aurora-velvet',
        createdAt: new Date().toISOString(),
        autoSync: true,
        deviceId: 'dev_ui_current',
        deviceName: 'Desktop Chrome',
        deviceType: 'desktop',
        devices: [
          {
            id: 'dev_ui_current',
            name: 'Desktop Chrome',
            type: 'desktop',
            pairedAt: new Date().toISOString(),
            lastSyncAt: new Date().toISOString(),
            status: 'active',
          },
        ],
        revokedDeviceIds: [],
      });

      const onFeedback = vi.fn();
      render(<SyncSettingsCard onFeedback={onFeedback} />);

      // Disclaimer A: Device Sync Key
      expect(
        screen.getByText('Keep your Device Sync Key private.')
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Anyone who obtains this key may be able to pair another device with your sync vault/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Never post it publicly, send it to strangers, or include it in screenshots or support requests/i)
      ).toBeInTheDocument();

      // Disclaimer B: Secret Passphrase
      expect(
        screen.getByText('Never share your Secret Passphrase.')
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Your dream journal may contain deeply personal experiences/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Oneiric support will never need you to disclose it/i)
      ).toBeInTheDocument();

      // Connected Devices Section renders
      expect(screen.getByText(/Connected Devices \(1\)/i)).toBeInTheDocument();
      expect(screen.getByText('Desktop Chrome')).toBeInTheDocument();
      expect(screen.getByText('This Device')).toBeInTheDocument();
      expect(
        screen.getByText(/No other devices are currently paired with this vault/i)
      ).toBeInTheDocument();
    });

    it('ensures secrets never appear in error messages or logs', async () => {
      const secretPass = 'super-secret-sensitive-passphrase-phrase-123';
      const secretKey = 'ONR-SYNC-secretvault::super-secret-sensitive';
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Simulate a network failure
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

      try {
        await syncService.connectVault(secretKey, secretPass, 'Phone');
      } catch (err: any) {
        expect(err.message).not.toContain(secretPass);
        expect(err.message).not.toContain(secretKey);
      }

      // Check console logs
      const allCalls = [
        ...consoleErrorSpy.mock.calls,
        ...consoleWarnSpy.mock.calls,
        ...consoleLogSpy.mock.calls,
      ].flat();

      for (const callArg of allCalls) {
        const text = typeof callArg === 'string' ? callArg : JSON.stringify(callArg);
        expect(text).not.toContain(secretPass);
      }
    });
  });
});
