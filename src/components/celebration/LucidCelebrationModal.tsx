import React, { useEffect, useRef, useState, useCallback } from 'react';
import { LucidCelebrationEvent } from '../../services/celebrationService';
import { celebrationAudio } from '../../utils/celebrationSound';

interface LucidCelebrationModalProps {
  event: LucidCelebrationEvent | null;
  onDismiss: () => void;
  onGoToSettings?: () => void;
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
}

// Tasteful blue, gold, and white confetti palette
const PALETTE = [
  '#2563eb', // Cobalt blue
  '#3b82f6', // Vivid blue
  '#60a5fa', // Soft sky blue
  '#93c5fd', // Light starlight blue
  '#fbbf24', // Warm gold
  '#f59e0b', // Deep amber gold
  '#fde047', // Radiant gold
  '#ffffff', // Crisp white
  '#f1f5f9', // Slate starlight
];

export const LucidCelebrationModal: React.FC<LucidCelebrationModalProps> = ({
  event,
  onDismiss,
  onGoToSettings,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
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

  const handleGoToSettings = useCallback(() => {
    if (onGoToSettings) {
      onGoToSettings();
    } else {
      onDismiss();
    }
  }, [onGoToSettings, onDismiss]);

  // Play celebratory sound effects, lock body scroll, and handle Escape / Enter keys
  useEffect(() => {
    if (!event) return;

    // Play synthesized celebratory fanfare and pop sound effect
    try {
      celebrationAudio.playCelebrationSound(event.isFirstLucid);
    } catch {
      // Audio playback failsafe
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        handleDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Focus container so key events are caught immediately
    const timer = setTimeout(() => {
      containerRef.current?.focus();
    }, 50);

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

    // Particle count: animation intensity difference between first and subsequent celebrations
    const particleCount = event.isFirstLucid ? 300 : 150;
    const particles: ConfettiParticle[] = [];

    for (let i = 0; i < particleCount; i++) {
      const isFirst = event.isFirstLucid;
      const angle = isFirst
        ? Math.random() * Math.PI * 2
        : (Math.PI / 4) + Math.random() * (Math.PI / 2);
      const speed = isFirst ? 5 + Math.random() * 14 : 3 + Math.random() * 8;
      const startX = isFirst
        ? width / 2 + (Math.random() - 0.5) * 120
        : Math.random() * width;
      const startY = isFirst
        ? height / 2 + (Math.random() - 0.5) * 120
        : -20 - Math.random() * 120;

      const shapes: ('rect' | 'circle' | 'streamer')[] = ['rect', 'rect', 'circle', 'streamer'];
      const shape = shapes[Math.floor(Math.random() * shapes.length)];

      particles.push({
        x: startX,
        y: startY,
        vx: isFirst ? Math.cos(angle) * speed : (Math.random() - 0.5) * 4,
        vy: isFirst ? Math.sin(angle) * speed - 4 : speed,
        size: shape === 'streamer' ? 3 + Math.random() * 3 : 5 + Math.random() * 7,
        color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
        tilt: Math.random() * 10 - 5,
        tiltSpeed: 0.04 + Math.random() * 0.08,
        tiltAngle: Math.random() * Math.PI * 2,
        shape,
        streamerLength: shape === 'streamer' ? 16 + Math.random() * 22 : undefined,
        opacity: 1,
      });
    }

    const gravity = 0.11;
    const drag = 0.988;
    let isRunning = true;

    const render = () => {
      if (!isRunning) return;
      ctx.clearRect(0, 0, width, height);

      let activeParticles = 0;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        p.vx *= drag;
        p.vy = p.vy * drag + gravity;
        p.x += p.vx;
        p.y += p.vy;

        p.tiltAngle += p.tiltSpeed;
        p.tilt = Math.sin(p.tiltAngle) * 12;

        // Wrap around bottom
        if (p.y > height + 50) {
          p.y = -25;
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
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      tabIndex={0}
      aria-labelledby="celebration-heading"
      onClick={handleDismiss}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 sm:p-12 overflow-hidden bg-[#0b132b]/95 backdrop-blur-xl animate-fadeIn select-none cursor-pointer focus:outline-none"
    >
      {/* Full-Screen Confetti Canvas */}
      {!prefersReducedMotion && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none w-full h-full z-0"
          aria-hidden="true"
        />
      )}

      {/* Atmospheric Midnight Lighting */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-[500px] h-[500px] bg-amber-400/8 rounded-full blur-[130px] pointer-events-none"
        aria-hidden="true"
      />

      {/* Dominant Screen Content */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-4xl mx-auto px-4 pointer-events-auto">
        {/* Giant Hero Headline */}
        <h1
          id="celebration-heading"
          className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tight text-white drop-shadow-[0_10px_35px_rgba(37,99,235,0.35)] leading-none mb-3 sm:mb-5 font-sans"
        >
          YOU DID IT!
        </h1>

        {/* Enormous Secondary Congratulation */}
        <div className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-blue-300 uppercase mb-4 sm:mb-6 drop-shadow-md">
          CONGRATULATIONS!
        </div>

        {/* Lucid Dream Clarification Line */}
        <p className="text-lg sm:text-2xl md:text-3xl text-slate-200 font-light tracking-wide max-w-2xl mx-auto mb-2 sm:mb-3">
          You had a lucid dream!
        </p>

        {/* Optional Dream Title */}
        {event.dreamTitle && (
          <p className="text-xs sm:text-sm text-blue-300/80 font-mono tracking-wide max-w-md mx-auto truncate mb-4">
            &ldquo;{event.dreamTitle}&rdquo;
          </p>
        )}

        {/* Dismiss Instruction & Turn Off Link */}
        <div className="mt-8 sm:mt-10 flex flex-col items-center gap-3">
          <p className="text-xs sm:text-sm text-slate-400 tracking-wider uppercase font-medium">
            Click anywhere to continue
          </p>

          {/* Turn it off link (redirects to settings) */}
          {onGoToSettings && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleGoToSettings();
              }}
              className="text-xs text-blue-400 hover:text-blue-300 underline underline-offset-4 transition-colors cursor-pointer pt-1"
            >
              Want to turn it off?
            </button>
          )}

          {/* Dev Preview Notice */}
          {event.isDevPreview && (
            <span className="text-[11px] font-mono text-amber-300/90 bg-amber-950/40 border border-amber-800/40 px-3 py-1 rounded-md mt-2">
              Developer Test Mode &middot; No records altered
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
