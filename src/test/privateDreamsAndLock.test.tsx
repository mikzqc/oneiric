import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { securityService } from '../services/securityService';
import { dreamService } from '../services/dreamService';
import { db } from '../db/database';
import { AppLockScreen } from '../components/security/AppLockScreen';

describe('Private Dreams & Hardware-Derived App Lock', () => {
  beforeEach(async () => {
    localStorage.clear();
    await db.dreams.clear();
    await db.customTags.clear();
    // Reset security service state
    securityService.lock();
  });

  it('sets up a PIN, derives PBKDF2 AES-GCM key envelope, and protects master key', async () => {
    // Initially not configured
    expect(securityService.getConfig().hasPin).toBe(false);

    // Set PIN: '1234'
    await securityService.setPin('1234');

    const config = securityService.getConfig();
    expect(config.hasPin).toBe(true);
    expect(config.isAppLockEnabled).toBe(true);
    expect(config.encryptedKeyEnvelope).toBeDefined();
    expect(config.encryptedKeyEnvelope?.ciphertext).toBeDefined();
    expect(config.encryptedKeyEnvelope?.salt).toBeDefined();
    expect(config.encryptedKeyEnvelope?.iv).toBeDefined();

    // Master key is cached in session
    const masterKey = securityService.getMasterKey();
    expect(masterKey).toBeTruthy();

    // Lock the app -> master key is wiped from memory
    securityService.lock();
    expect(securityService.isAppLocked()).toBe(true);
    expect(securityService.getMasterKey()).toBeNull();

    // Unlock with correct PIN -> master key restored
    const unlocked = await securityService.unlockWithPin('1234');
    expect(unlocked).toBe(true);
    expect(securityService.isAppLocked()).toBe(false);
    expect(securityService.getMasterKey()).toBe(masterKey);

    // Test incorrect PIN -> rejected
    securityService.lock();
    const failedUnlock = await securityService.unlockWithPin('9999');
    expect(failedUnlock).toBe(false);
    expect(securityService.isAppLocked()).toBe(true);
    expect(securityService.getMasterKey()).toBeNull();
  });

  it('separates private dreams from public journal when locked, but preserves analytics counts', async () => {
    // Set PIN and unlock vault
    await securityService.setPin('1234');

    // Create 1 public dream and 1 private dream
    await dreamService.createDream({
      title: 'Public Flight',
      narrative: 'Soaring freely over the ocean.',
      date: '2026-11-09',
      vividness: 4,
      recallQuality: 'vivid',
      lucidity: 'lucid',
      emotions: ['Joy'],
      tags: ['flying'],
      isPrivate: false,
    });

    await dreamService.createDream({
      title: 'Top Secret Dream',
      narrative: 'Private personal reflection.',
      date: '2026-11-09',
      vividness: 5,
      recallQuality: 'detailed',
      lucidity: 'non-lucid',
      emotions: ['Mystery'],
      tags: ['confidential'],
      isPrivate: true,
    });

    // When unlocked:
    const allWhenUnlocked = await dreamService.getAllDreams();
    expect(allWhenUnlocked.length).toBe(2);

    // Now lock the vault:
    securityService.lock();
    expect(securityService.isVaultUnlocked()).toBe(false);

    // Normal journal query returns ONLY public dreams:
    const publicDreamsWhenLocked = await dreamService.getAllDreams();
    expect(publicDreamsWhenLocked.length).toBe(1);
    expect(publicDreamsWhenLocked[0].title).toBe('Public Flight');

    // Private dreams are preserved in private query:
    const privateDreams = await dreamService.getPrivateDreams();
    expect(privateDreams.length).toBe(1);
    expect(privateDreams[0].title).toBe('Top Secret Dream');

    // Analytics calculation preserves both dreams (totals and recall streak remain accurate):
    const stats = await dreamService.getDashboardStats();
    expect(stats.totalDreams).toBe(2); // Both counted in stats!
    expect(stats.totalLucid).toBe(1);
    expect(stats.recentDreams.length).toBe(1); // Recent public dreams hides the private dream
    expect(stats.recentDreams[0].title).toBe('Public Flight');
  });

  it('AppLockScreen unlocks when entering valid PIN and rejects invalid PIN', async () => {
    await securityService.setPin('4321');
    securityService.lock();
    expect(securityService.isAppLocked()).toBe(true);

    render(<AppLockScreen />);

    expect(screen.getByText('Oneiric Locked')).toBeInTheDocument();

    const pinInput = screen.getByPlaceholderText(/enter pin/i);
    const unlockBtn = screen.getByRole('button', { name: /unlock oneiric/i });

    // Enter wrong PIN
    fireEvent.change(pinInput, { target: { value: '0000' } });
    fireEvent.click(unlockBtn);

    await waitFor(() => {
      expect(screen.getByText(/incorrect pin/i)).toBeInTheDocument();
    });
    expect(securityService.isAppLocked()).toBe(true);

    // Enter correct PIN
    fireEvent.change(pinInput, { target: { value: '4321' } });
    fireEvent.click(unlockBtn);

    await waitFor(() => {
      expect(securityService.isAppLocked()).toBe(false);
    });
  });
});
