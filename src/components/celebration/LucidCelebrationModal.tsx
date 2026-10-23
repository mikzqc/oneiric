import React, { useEffect, useRef, useState, useCallback } from 'react';
import { LucidCelebrationEvent } from '../../services/celebrationService';
import { Button } from '../common/Button';
import { Award, Compass, Sparkles, X } from 'lucide-react';

interface LucidCelebrationModalProps {
  event: LucidCelebrationEvent | null;
  onDismiss: () => void;
}

interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  tilt: number;
  tiltSpeed: number;
  tiltAngle: number;
  shape: 'rect' | 'circle' | 'streamer';
  streamerLength?: number;
  opacity: number;
  decay: number;
}

const PALETTE = [
  '#fbbf24', // Amber gold
  '#f59e0b', // Deep gold
  '#60a5fa', // Soft cobalt
  '#3b82f6', // Cobalt blue
  '#06b6d4', // Cyan
  '#38bdf8', // Sky
  '#818cf8', // Indigo
  '#a855f7', // Purple
  '#f8fafc', // Starlight white
];

export const LucidCelebrationModal: React.FC<LucidCelebrationModalProps> = ({ event, onDismiss }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const dismissBtnRef = useRef<HTMLButtonElement | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  // Check reduced motion preference changes
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const media = window.matchMedia('(prefers-reduced-motion: reduce)');
      const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }
  }, []);

  const handleDismiss = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  // Lock body scroll and handle Escape key
  useEffect(() => {
    if (!event) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Focus primary dismiss button
    const timer = setTimeout(() => {
      dismissBtnRef.current?.focus();
    }, 100);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
    };
  }, [event, handleDismiss]);

  // Canvas particle celebration engine
  useEffect(() => {
    if (!event || prefersReducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = canvas.getContext ? canvas.getContext('2d') : null;
    } catch {
      ctx = null;
    }
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const particleCount = event.isFirstLucid ? 220 : 100;
    const particles: ConfettiParticle[] = [];

    // Initialize particles with central burst for first-lucid or festive arc for subsequent
    for (let i = 0; i < particleCount; i++) {
      const isFirst = event.isFirstLucid;
      const angle = isFirst ? Math.random() * Math.PI * 2 : (Math.PI / 4) + Math.random() * (Math.PI / 2);
      const speed = isFirst ? 4 + Math.random() * 12 : 3 + Math.random() * 8;
      const startX = isFirst ? width / 2 + (Math.random() - 0.5) * 80 : Math.random() * width;
      const startY = isFirst ? height / 2 + (Math.random() - 0.5) * 80 : -20 - Math.random() * 100;

      const shapes: ('rect' | 'circle' | 'streamer')[] = ['rect', 'rect', 'circle', 'streamer'];
      const shape = shapes[Math.floor(Math.random() * shapes.length)];

      particles.push({
        x: startX,
        y: startY,
        vx: isFirst ? Math.cos(angle) * speed : (Math.random() - 0.5) * 4,
        vy: isFirst ? Math.sin(angle) * speed - 3 : speed,
        size: shape === 'streamer' ? 3 + Math.random() * 3 : 5 + Math.random() * 6,
        color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
        tilt: Math.random() * 10 - 5,
        tiltSpeed: 0.05 + Math.random() * 0.08,
        tiltAngle: Math.random() * Math.PI * 2,
        shape,
        streamerLength: shape === 'streamer' ? 14 + Math.random() * 18 : undefined,
        opacity: 1,
        decay: 0.0005 + Math.random() * 0.001,
      });
    }

    const gravity = 0.12;
    const drag = 0.985;
    let isRunning = true;

    const render = () => {
      if (!isRunning) return;
      ctx.clearRect(0, 0, width, height);

      let activeParticles = 0;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Apply physics
        p.vx *= drag;
        p.vy = p.vy * drag + gravity;
        p.x += p.vx;
        p.y += p.vy;

        p.tiltAngle += p.tiltSpeed;
        p.tilt = Math.sin(p.tiltAngle) * 12;

        // Wrap around bottom
        if (p.y > height + 40) {
          p.y = -20;
          p.x = Math.random() * width;
          p.vy = 2 + Math.random() * 4;
          p.vx = (Math.random() - 0.5) * 2;
        }

        // Draw particle
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillStyle = p.color;
        ctx.strokeStyle = p.color;

        ctx.translate(p.x, p.y);
        ctx.rotate(p.tiltAngle);

        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * Math.cos(p.tiltAngle));
        } else if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === 'streamer') {
          ctx.lineWidth = p.size;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(p.tilt, p.streamerLength! / 2, 0, p.streamerLength!);
          ctx.stroke();
        }

        ctx.restore();
        activeParticles++;
      }

      if (activeParticles > 0) {
        animationFrameRef.current = requestAnimationFrame(render);
      }
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [event, prefersReducedMotion]);

  if (!event) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="celebration-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0b132b]/85 backdrop-blur-md animate-fadeIn"
    >
      {/* Confetti Canvas */}
      {!prefersReducedMotion && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none w-full h-full z-0"
          aria-hidden="true"
        />
      )}

      {/* Main Celebration Card */}
      <div className="relative z-10 w-full max-w-md p-6 sm:p-8 rounded-xl bg-[#101a38] border border-blue-500/50 shadow-2xl text-center overflow-hidden">
        {/* Subtle decorative glow */}
        <div
          className="absolute -top-24 -left-24 w-48 h-48 bg-blue-600/15 rounded-full blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        {/* Close Icon (Top Right) */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 p-1.5 rounded-lg hover:bg-slate-800/60 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Dismiss celebration"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Achievement / Lucidity Milestone Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase mb-3 border shadow-sm">
          {event.isFirstLucid ? (
            <div className="inline-flex items-center gap-1.5 text-amber-300 bg-amber-950/60 border border-amber-500/50 px-3 py-1 rounded-full">
              <Award className="w-4 h-4 text-amber-400 animate-bounce" />
              <span>FIRST LUCID DREAM UNLOCKED</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 text-blue-300 bg-blue-950/60 border border-blue-500/50 px-3 py-1 rounded-full">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span>LUCID DREAM #{event.lucidCount}</span>
            </div>
          )}
        </div>

        {/* Primary Celebratory Headline */}
        <h1
          id="celebration-title"
          className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-1.5 drop-shadow-sm font-sans"
        >
          YOU DID IT!
        </h1>

        {/* Secondary Headline */}
        <h2 className="text-base sm:text-lg font-bold text-blue-400 tracking-wide uppercase mb-3">
          YOU HAD A LUCID DREAM!
        </h2>

        {/* Congratulatory Message */}
        <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-5 font-normal max-w-sm mx-auto">
          You recognized the dream. Your practice is paying off.
        </p>

        {/* Optional Dream Title Reference */}
        {event.dreamTitle && (
          <div className="flex items-center justify-center gap-2 mb-6 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-300 max-w-xs mx-auto truncate font-mono">
            <Compass className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="truncate">&ldquo;{event.dreamTitle}&rdquo;</span>
          </div>
        )}

        {/* Developer Preview Badge Notice */}
        {event.isDevPreview && (
          <div className="mb-4 inline-block text-[11px] font-mono text-amber-300/90 bg-amber-950/50 border border-amber-800/60 px-2.5 py-0.5 rounded-md">
            Developer Test Mode &middot; No records modified
          </div>
        )}

        {/* Primary Action Button */}
        <div className="pt-2">
          <Button
            ref={dismissBtnRef}
            variant="primary"
            size="md"
            className="w-full text-sm font-semibold justify-center py-2.5 shadow-md shadow-blue-600/30 cursor-pointer"
            onClick={handleDismiss}
          >
            Return to Journal
          </Button>
        </div>
      </div>
    </div>
  );
};
