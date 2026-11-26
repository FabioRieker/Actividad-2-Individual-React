import { useEffect, useRef } from 'react';

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Llama a onFrame en cada fotograma (requestAnimationFrame) con el tiempo en ms.
 * Se pausa con document.hidden o enabled=false y no arranca con prefers-reduced-motion: reduce.
 */
export function useAnimationClock(onFrame: (timeMs: number) => void, enabled = true): void {
  const callback = useRef(onFrame);
  useEffect(() => {
    callback.current = onFrame;
  });

  useEffect(() => {
    if (!enabled || prefersReducedMotion()) return;
    let frame = 0;
    let running = false;
    const tick = (time: number): void => {
      callback.current(time);
      frame = requestAnimationFrame(tick);
    };
    const start = (): void => {
      if (running || document.hidden) return;
      running = true;
      frame = requestAnimationFrame(tick);
    };
    const stop = (): void => {
      cancelAnimationFrame(frame);
      running = false;
    };
    const onVisibility = (): void => {
      if (document.hidden) stop();
      else start();
    };
    document.addEventListener('visibilitychange', onVisibility);
    start();
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      stop();
    };
  }, [enabled]);
}
