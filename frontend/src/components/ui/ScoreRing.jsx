import { useEffect, useRef, useState } from "react";

import { colors } from "../../design/tokens";
import { useCountUp, usePrefersReducedMotion, useReveal } from "../../hooks/useMotion";

/**
 * The circular match score, shared by the landing preview and the match cards.
 * The arc sweeps from zero and the number counts up, once the ring is on
 * screen. With reduced motion it simply renders at its final value.
 */
export default function ScoreRing({ value, size = 86, stroke = 6, animate = true }) {
  const safe = Math.max(0, Math.min(100, Number(value) || 0));
  const reduced = usePrefersReducedMotion();
  const { ref, visible } = useReveal({ threshold: 0.4 });

  const shouldAnimate = animate && !reduced;
  const [armed, setArmed] = useState(!shouldAnimate);
  const timer = useRef(null);

  useEffect(() => {
    if (!shouldAnimate || !visible) return;
    // One frame's delay so the browser paints the zero state first, otherwise
    // the transition has nothing to move from
    timer.current = requestAnimationFrame(() => setArmed(true));
    return () => cancelAnimationFrame(timer.current);
  }, [shouldAnimate, visible]);

  const shown = useCountUp(safe, { duration: 1000, start: !shouldAnimate || visible });

  const radius = size / 2 - stroke;
  const circumference = 2 * Math.PI * radius;
  const filled = (safe / 100) * circumference;
  const ringColor = safe >= 50 ? colors.brand : colors.accent;

  return (
    <div
      ref={ref}
      className="relative grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Match score ${safe} percent`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.line}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${armed ? filled : 0} ${circumference}`}
          style={{
            transition: shouldAnimate
              ? "stroke-dasharray 1000ms cubic-bezier(0.22, 0.61, 0.36, 1)"
              : undefined,
          }}
        />
      </svg>
      <div
        className="absolute font-display font-semibold leading-none text-ink"
        style={{ fontSize: size * 0.28 }}
      >
        {shown}
        <span style={{ fontSize: size * 0.18 }}>%</span>
      </div>
    </div>
  );
}
