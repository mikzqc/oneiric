import React, { useEffect, useRef, useState } from 'react';
import { preferencesService, PREFERENCES_CHANGED_EVENT } from '../../services/preferencesService';
import { UserPreferences } from '../../types/preferences';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseAlpha: number;
  alpha: number;
  pulseSpeed: number;
  pulsePhase: number;
}

export const AtmosphericBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isVisibleRef = useRef<boolean>(true);

  const [prefs, setPrefs] = useState<UserPreferences>(() => preferencesService.getPreferences());

  useEffect(() => {
    const handlePrefsChange = (e: Event) => {
      const custom = e as CustomEvent<UserPreferences>;
      if (custom.detail) {
        setPrefs(custom.detail);
      }
    };
    window.addEventListener(PREFERENCES_CHANGED_EVENT, handlePrefsChange);
    return () => window.removeEventListener(PREFERENCES_CHANGED_EVENT, handlePrefsChange);
  }, []);

  const isMotionReduced =
    prefs.motionPreference === 'reduced' ||
    (prefs.motionPreference === 'auto' &&
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);

  const isParticlesEnabled = prefs.enableAtmosphericParticles && !isMotionReduced;

  useEffect(() => {
    if (!isParticlesEnabled) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    const handleVisibilityChange = () => {
      isVisibleRef.current = !document.hidden;
      if (!document.hidden && !animFrameRef.current && isParticlesEnabled) {
        animFrameRef.current = requestAnimationFrame(render);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Create 18-24 sparse, restrained ambient particles
    const particleCount = Math.min(22, Math.max(12, Math.floor(width / 75)));
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.12,
        vy: -0.06 - Math.random() * 0.14, // Calm upward nocturnal drift
        radius: 0.75 + Math.random() * 1.25,
        baseAlpha: 0.08 + Math.random() * 0.16,
        alpha: 0.1,
        pulseSpeed: 0.008 + Math.random() * 0.014,
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }

    let lastTime = performance.now();

    const render = (currentTime: number) => {
      if (!isVisibleRef.current) {
        animFrameRef.current = null;
        return;
      }

      const delta = Math.min(currentTime - lastTime, 64);
      lastTime = currentTime;
      const speedFactor = delta / 16.66;

      ctx.clearRect(0, 0, width, height);

      // Read accent color from active CSS theme or fallback
      ctx.fillStyle = '#94a3b8';

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.pulsePhase += p.pulseSpeed * speedFactor;
        p.alpha = p.baseAlpha * (0.65 + 0.35 * Math.sin(p.pulsePhase));

        p.x += p.vx * speedFactor;
        p.y += p.vy * speedFactor;

        // Wrap around boundaries smoothly
        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isParticlesEnabled]);

  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* Ambient Radial Gradient Depth Layer (Fluid & Subtle) */}
      {!isMotionReduced && (
        <div
          className="absolute -top-[25%] -left-[20%] w-[140%] h-[140%] opacity-20 blur-3xl animate-ambient"
          style={{
            background:
              'radial-gradient(ellipse 65% 55% at 30% 25%, var(--accent-primary, #2563eb) 0%, transparent 60%), radial-gradient(ellipse 50% 45% at 75% 70%, var(--bg-surface-raised, #152248) 0%, transparent 55%)',
          }}
        />
      )}

      {/* Sparse Micro-Particle Canvas */}
      {isParticlesEnabled && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full opacity-60"
        />
      )}
    </div>
  );
};
