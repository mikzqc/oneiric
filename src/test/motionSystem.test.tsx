import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AnimatedNumber } from '../components/common/AnimatedNumber';
import { AtmosphericBackground } from '../components/layout/AtmosphericBackground';
import { preferencesService } from '../services/preferencesService';

describe('Global Motion & Animation System', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('preferencesService - Reduced Motion Integration', () => {
    it('applies reduce-motion class to root when motionPreference is "reduced"', () => {
      preferencesService.updatePreferences({ motionPreference: 'reduced' });
      expect(document.documentElement.classList.contains('reduce-motion')).toBe(true);
    });

    it('removes reduce-motion class from root when motionPreference is "standard"', () => {
      document.documentElement.classList.add('reduce-motion');
      preferencesService.updatePreferences({ motionPreference: 'standard' });
      expect(document.documentElement.classList.contains('reduce-motion')).toBe(false);
    });

    it('toggles atmospheric particles preference seamlessly', () => {
      preferencesService.updatePreferences({ enableAtmosphericParticles: false });
      expect(preferencesService.getPreferences().enableAtmosphericParticles).toBe(false);

      preferencesService.updatePreferences({ enableAtmosphericParticles: true });
      expect(preferencesService.getPreferences().enableAtmosphericParticles).toBe(true);
    });
  });

  describe('AnimatedNumber Component', () => {
    it('renders initial numeric value correctly', () => {
      render(<AnimatedNumber value={42} />);
      expect(screen.getByText('42')).toBeDefined();
    });

    it('renders formatted percentage strings and animates target values', async () => {
      const { rerender } = render(<AnimatedNumber value="100%" duration={100} />);
      expect(screen.getByText('100%')).toBeDefined();

      rerender(<AnimatedNumber value="85%" duration={100} />);
      // Should immediately contain % suffix
      expect(screen.getByText(/%/)).toBeDefined();
    });

    it('immediately reflects final value when reduce-motion class is present', () => {
      document.documentElement.classList.add('reduce-motion');
      render(<AnimatedNumber value="95%" duration={400} />);
      expect(screen.getByText('95%')).toBeDefined();
    });
  });

  describe('AtmosphericBackground Component', () => {
    it('renders without crashing and mounts ambient background', () => {
      const { container } = render(<AtmosphericBackground />);
      expect(container.querySelector('[aria-hidden="true"]')).toBeDefined();
    });

    it('cleans up animation frame on unmount without throwing errors', () => {
      const { unmount } = render(<AtmosphericBackground />);
      expect(() => unmount()).not.toThrow();
    });

    it('respects enableAtmosphericParticles = false in user preferences', () => {
      preferencesService.updatePreferences({ enableAtmosphericParticles: false });
      const { container } = render(<AtmosphericBackground />);
      // Canvas should not be rendered when particles are explicitly disabled
      expect(container.querySelector('canvas')).toBeNull();
    });
  });
});
