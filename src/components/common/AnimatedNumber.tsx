import React, { useEffect, useState, useRef } from 'react';

interface AnimatedNumberProps {
  value: number | string;
  duration?: number;
  className?: string;
  formatter?: (val: number) => string;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  duration = 420,
  className = '',
  formatter,
}) => {
  // Parse numeric target and suffix/prefix if value is a string (e.g. "85%", "7 days")
  const parseVal = (v: number | string): { num: number; suffix: string; prefix: string } => {
    if (typeof v === 'number') return { num: v, suffix: '', prefix: '' };
    const match = v.match(/^([^0-9.-]*)([0-9.-]+)(.*)$/);
    if (match) {
      const parsedNum = parseFloat(match[2]);
      return {
        prefix: match[1] || '',
        num: isNaN(parsedNum) ? 0 : parsedNum,
        suffix: match[3] || '',
      };
    }
    return { num: 0, suffix: v, prefix: '' };
  };

  const { num: targetNum, prefix, suffix } = parseVal(value);
  const [displayNum, setDisplayNum] = useState<number>(targetNum);
  const prevTargetRef = useRef<number>(targetNum);
  const animFrameRef = useRef<number | null>(null);

  const isReduced =
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ||
      document.documentElement.classList.contains('reduce-motion'));

  useEffect(() => {
    if (isReduced || duration <= 0) {
      prevTargetRef.current = targetNum;
      return;
    }

    const startNum = prevTargetRef.current;
    const diff = targetNum - startNum;
    if (Math.abs(diff) < 0.001) {
      return;
    }

    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = startNum + diff * easeProgress;

      setDisplayNum(current);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayNum(targetNum);
        prevTargetRef.current = targetNum;
        animFrameRef.current = null;
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [targetNum, duration, isReduced]);

  const currentVal = isReduced || duration <= 0 ? targetNum : displayNum;

  const formattedNumber = formatter
    ? formatter(currentVal)
    : Number.isInteger(targetNum)
    ? Math.round(currentVal).toString()
    : currentVal.toFixed(1);

  return (
    <span className={className}>
      {prefix}
      {formattedNumber}
      {suffix}
    </span>
  );
};
