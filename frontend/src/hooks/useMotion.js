/**
 * Small motion helpers. Everything here checks prefers-reduced-motion first
 * and degrades to the finished state rather than animating.
 */

import { useEffect, useRef, useState } from "react";

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false
  );

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (event) => setReduced(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

/**
 * Reveals an element once it scrolls into view. Fires a single time, so
 * content does not flicker when scrolling back up.
 */
export function useReveal({ threshold = 0.15, rootMargin = "0px 0px -60px 0px" } = {}) {
  const ref = useRef(null);
  const reduced = usePrefersReducedMotion();
  const [visible, setVisible] = useState(reduced);

  useEffect(() => {
    if (reduced) {
      setVisible(true);
      return;
    }
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold, rootMargin }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [reduced, threshold, rootMargin]);

  return { ref, visible };
}

/**
 * Counts from zero up to a target. Uses an ease-out curve so it decelerates
 * into the final value instead of stopping dead.
 */
export function useCountUp(target, { duration = 900, decimals = 0, start = true } = {}) {
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = useState(reduced || !start ? target : 0);
  const frame = useRef(null);

  useEffect(() => {
    if (reduced || !start) {
      setValue(target);
      return;
    }

    const from = 0;
    const startedAt = performance.now();

    function tick(now) {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(from + (target - from) * eased);
      if (progress < 1) frame.current = requestAnimationFrame(tick);
    }

    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [target, duration, reduced, start]);

  return decimals > 0 ? Number(value.toFixed(decimals)) : Math.round(value);
}
