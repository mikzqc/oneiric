/**
 * Oneiric Security, App Lock & Key Protection Service
 *
 * Implements hardware-backed Web Crypto security:
 * - PBKDF2 key derivation (100,000 iterations SHA-256)
 * - Authenticated AES-256-GCM for master key envelope encryption
 * - Secure in-memory session key caching with instant wipe on lock/blur
 * - WebAuthn platform authenticator (Windows Hello / Touch ID) support
 */

import { cryptoService } from './cryptoService';

export interface SecurityConfig {
  isAppLockEnabled: boolean;
  autoLockOnBlur: boolean;
  biometricEnabled: boolean;
  encryptedKeyEnvelope?: {
    ciphertext: string;
    salt: string;
    iv: string;
  };
  hasPin: boolean;
}

const SECURITY_CONFIG_KEY = 'oneiric_security_config';
const BIOMETRIC_CREDENTIAL_KEY = 'oneiric_bio_credential_id';

class SecurityService {
  private inMemoryMasterKey: string | null = null;
  private isLocked: boolean = false;
  private isVaultLocked: boolean = true;
  private listeners: Array<() => void> = [];

  constructor() {
    // If app lock is enabled in config, initialize in locked state
    const config = this.getConfig();
    if (config.isAppLockEnabled && config.hasPin) {
      this.isLocked = true;
    }
    // Private vault ALWAYS initializes locked whenever the application starts or reloads
    this.isVaultLocked = true;

    if (typeof window !== 'undefined') {
      // Auto-lock private vault on refresh, page unload, or tab close
      window.addEventListener('beforeunload', () => {
        this.lockVault();
      });

      window.addEventListener('pagehide', () => {
        this.lockVault();
      });

      window.addEventListener('pageshow', (event: PageTransitionEvent) => {
        if (event.persisted) {
          this.lockVault();
        }
      });

      // Auto-lock when tab becomes hidden or window loses focus
      window.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          const currentConfig = this.getConfig();
          if (currentConfig.autoLockOnBlur && currentConfig.hasPin) {
            this.lock();
          }
        }
      });

      window.addEventListener('blur', () => {
        const currentConfig = this.getConfig();
        if (currentConfig.autoLockOnBlur && currentConfig.hasPin) {
          this.lock();
        }
      });
    }
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch {
        // ignore subscriber errors
      }
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('oneiric:security-changed'));
    }
  }

  public getConfig(): SecurityConfig {
    if (typeof localStorage === 'undefined') {
      return {
        isAppLockEnabled: false,
        autoLockOnBlur: false,
        biometricEnabled: false,
        hasPin: false,
      };
    }

    try {
      const raw = localStorage.getItem(SECURITY_CONFIG_KEY);
      if (!raw) {
        return {
          isAppLockEnabled: false,
          autoLockOnBlur: false,
          biometricEnabled: false,
          hasPin: false,
        };
      }
      const parsed = JSON.parse(raw);
      return {
        isAppLockEnabled: Boolean(parsed.isAppLockEnabled),
        autoLockOnBlur: Boolean(parsed.autoLockOnBlur),
        biometricEnabled: Boolean(parsed.biometricEnabled),
        encryptedKeyEnvelope: parsed.encryptedKeyEnvelope,
        hasPin: Boolean(parsed.encryptedKeyEnvelope?.ciphertext),
      };
    } catch {
      return {
        isAppLockEnabled: false,
        autoLockOnBlur: false,
        biometricEnabled: false,
        hasPin: false,
      };
    }
  }

  private saveConfig(config: Partial<SecurityConfig>) {
    const current = this.getConfig();
    const updated = { ...current, ...config };
    localStorage.setItem(
      SECURITY_CONFIG_KEY,
      JSON.stringify({
        isAppLockEnabled: updated.isAppLockEnabled,
        autoLockOnBlur: updated.autoLockOnBlur,
        biometricEnabled: updated.biometricEnabled,
        encryptedKeyEnvelope: updated.encryptedKeyEnvelope,
      })
    );
    this.notify();
  }

  public isAppLocked(): boolean {
    const config = this.getConfig();
    return config.isAppLockEnabled && config.hasPin && this.isLocked;
  }

  public isVaultUnlocked(): boolean {
    // If no PIN set, vault is considered open/unlocked
    const config = this.getConfig();
    if (!config.hasPin) return true;
    return !this.isVaultLocked && !!this.inMemoryMasterKey;
  }

  public getMasterKey(): string | null {
    return this.inMemoryMasterKey;
  }

  /**
   * Set up or change the user's PIN.
   * Cryptographically derives an AES-256-GCM key and wraps the master key.
   */
  public async setPin(newPin: string): Promise<void> {
    if (!newPin || newPin.trim().length < 4) {
      throw new Error('PIN must be at least 4 digits.');
    }

    const cleanPin = newPin.trim();

    // Use existing master key or generate a cryptographically strong new one
    let masterKey = this.inMemoryMasterKey;
    if (!masterKey) {
      // Check if sync service already has a passphrase, otherwise generate
      const existingSyncVault = localStorage.getItem('oneiric_sync_vault');
      if (existingSyncVault) {
        try {
          const parsed = JSON.parse(existingSyncVault);
          if (parsed.passphrase) masterKey = parsed.passphrase;
        } catch {
          // ignore
        }
      }
      if (!masterKey) {
        masterKey = cryptoService.generatePassphrase();
      }
    }

    // Encrypt the master key with the PIN using AES-256-GCM
    const envelope = await cryptoService.encryptData(masterKey, cleanPin);

    this.inMemoryMasterKey = masterKey;
    this.isLocked = false;
    this.isVaultLocked = false;

    this.saveConfig({
      isAppLockEnabled: true,
      encryptedKeyEnvelope: envelope,
    });
  }

  /**
   * Remove PIN and disable App Lock
   */
  public async removePin(currentPin: string): Promise<void> {
    // Verify current PIN before removal
    const verified = await this.unlockWithPin(currentPin);
    if (!verified) {
      throw new Error('Current PIN is incorrect.');
    }

    localStorage.removeItem(SECURITY_CONFIG_KEY);
    localStorage.removeItem(BIOMETRIC_CREDENTIAL_KEY);
    this.isLocked = false;
    this.isVaultLocked = false;
    this.notify();
  }

  /**
   * Unlocks Oneiric and decrypts the master key using the PIN.
   * By default, unlocks the application while keeping the Private Vault locked
   * until explicitly unlocked inside the Vault.
   */
  public async unlockWithPin(
    pin: string,
    options?: { unlockVault?: boolean }
  ): Promise<boolean> {
    const config = this.getConfig();
    if (!config.encryptedKeyEnvelope) {
      this.isLocked = false;
      if (options?.unlockVault) {
        this.isVaultLocked = false;
      }
      this.notify();
      return true;
    }

    try {
      // Authenticated AES-GCM decryption — throws if PIN is wrong
      const decryptedMasterKey = await cryptoService.decryptData<string>(
        config.encryptedKeyEnvelope,
        pin.trim()
      );

      this.inMemoryMasterKey = decryptedMasterKey;
      this.isLocked = false;
      if (options?.unlockVault) {
        this.isVaultLocked = false;
      }
      this.notify();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Specifically unlocks the Private Vault with PIN verification
   */
  public async unlockVaultWithPin(pin: string): Promise<boolean> {
    return await this.unlockWithPin(pin, { unlockVault: true });
  }

  /**
   * Locks the app and wipes the decrypted key from memory
   */
  public lock(): void {
    const config = this.getConfig();
    if (!config.hasPin) return;

    this.inMemoryMasterKey = null;
    this.isLocked = true;
    this.isVaultLocked = true;
    this.notify();
  }

  /**
   * Locks only the private vault (leaves general journal accessible)
   */
  public lockVault(): void {
    this.isVaultLocked = true;
    this.notify();
  }

  /**
   * Toggles auto-lock when window loses focus
   */
  public setAutoLockOnBlur(enabled: boolean): void {
    this.saveConfig({ autoLockOnBlur: enabled });
  }

  /**
   * Toggles whether App Lock is required on app launch
   */
  public setAppLockEnabled(enabled: boolean): void {
    this.saveConfig({ isAppLockEnabled: enabled });
  }

  /**
   * Checks whether platform biometric hardware (Windows Hello / Touch ID / Face ID) is supported
   */
  public async isBiometricAvailable(): Promise<boolean> {
    if (typeof window === 'undefined' || !window.PublicKeyCredential) {
      return false;
    }
    try {
      if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
        return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Registers a platform biometric credential to unlock the vault
   */
  public async enableBiometrics(): Promise<boolean> {
    const available = await this.isBiometricAvailable();
    if (!available) {
      throw new Error('Biometric hardware is not available on this device or browser.');
    }

    if (!this.inMemoryMasterKey) {
      throw new Error('App must be unlocked with PIN before enabling biometrics.');
    }

    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      const userId = new Uint8Array(16);
      window.crypto.getRandomValues(userId);

      const credential = (await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: 'Oneiric Dream Journal', id: window.location.hostname },
          user: {
            id: userId,
            name: 'oneiric-user',
            displayName: 'Oneiric Journal User',
          },
          pubKeyCredParams: [{ alg: -7, type: 'public-key' }, { alg: -257, type: 'public-key' }],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
          },
          timeout: 60000,
        },
      })) as PublicKeyCredential | null;

      if (!credential) return false;

      // Store credential ID and flag
      localStorage.setItem(BIOMETRIC_CREDENTIAL_KEY, credential.id);
      this.saveConfig({ biometricEnabled: true });
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Biometric setup failed';
      throw new Error(`Biometric registration failed: ${msg}`);
    }
  }

  /**
   * Authenticate using platform biometric (Windows Hello / Touch ID)
   */
  public async unlockWithBiometrics(): Promise<boolean> {
    const config = this.getConfig();
    if (!config.biometricEnabled || !config.encryptedKeyEnvelope) return false;

    const credId = localStorage.getItem(BIOMETRIC_CREDENTIAL_KEY);
    if (!credId) return false;

    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          timeout: 60000,
          userVerification: 'required',
        },
      });

      if (!assertion) return false;

      // Biometric verified successfully by OS hardware!
      // Since WebAuthn platform authenticator confirmed the user's presence,
      // we unlock the app session while keeping Private Vault locked unless requested.
      this.isLocked = false;
      this.notify();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Specifically unlocks the Private Vault with platform biometrics
   */
  public async unlockVaultWithBiometrics(): Promise<boolean> {
    const success = await this.unlockWithBiometrics();
    if (success) {
      this.isVaultLocked = false;
      this.notify();
    }
    return success;
  }

  public disableBiometrics(): void {
    localStorage.removeItem(BIOMETRIC_CREDENTIAL_KEY);
    this.saveConfig({ biometricEnabled: false });
  }
}

export const securityService = new SecurityService();
