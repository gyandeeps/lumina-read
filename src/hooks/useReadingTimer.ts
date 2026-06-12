import { useState, useCallback, useEffect, useSyncExternalStore } from 'react';

/**
 * Custom hook to track elapsed reading time per story session.
 * Pauses when mic is stopped, resumes when listening.
 *
 * Uses useSyncExternalStore so that only components that actually read
 * the elapsed time will re-render on each tick. The parent ReadingScreen
 * can call start/pause/reset without itself re-rendering every second.
 */

// ─── External store for timer state ──────────────────────────────────
// This allows multiple React components to subscribe independently.
// Only subscribers (e.g., the TimerDisplay) re-render on tick, not the
// entire ReadingScreen tree.

type Listener = () => void;

class TimerStore {
  private elapsedMs = 0;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private listeners = new Set<Listener>();

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private notify() {
    for (const l of this.listeners) l();
  }

  getSnapshot = (): number => {
    return this.elapsedMs;
  };

  start = () => {
    if (this.running) return;
    this.running = true;
    this.intervalId = setInterval(() => {
      this.elapsedMs += 1000;
      this.notify();
    }, 1000);
  };

  pause = () => {
    this.running = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  };

  reset = () => {
    this.pause();
    this.elapsedMs = 0;
    this.notify();
  };

  destroy = () => {
    this.pause();
    this.listeners.clear();
  };

  get isRunning() {
    return this.running;
  }
}

export function useReadingTimer() {
  // useState with lazy initializer creates the store exactly once per component
  // lifetime and avoids the ref-access-during-render lint issue.
  const [store] = useState(() => new TimerStore());

  // Clean up on unmount
  useEffect(() => {
    return () => {
      store.destroy();
    };
  }, [store]);

  // Stable callbacks that don't change across renders
  const start = useCallback(() => store.start(), [store]);
  const pause = useCallback(() => store.pause(), [store]);
  const reset = useCallback(() => store.reset(), [store]);

  /**
   * Returns a human-friendly formatted time string like "2m 34s" or "45s".
   * This reads from the store snapshot, so only components that call it
   * via useSyncExternalStore will re-render.
   */
  const getFormattedTime = useCallback((): string => {
    const totalSeconds = Math.floor(store.getSnapshot() / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
    }
    return `${seconds}s`;
  }, [store]);

  return {
    store,
    start,
    pause,
    reset,
    getFormattedTime,
  };
}

/**
 * Subscribes to the timer store and re-renders only when the elapsed time
 * changes. Use this in a small dedicated component to avoid re-rendering
 * the entire parent tree every second.
 */
export function useTimerDisplay(store: TimerStore): string {
  const elapsedMs = useSyncExternalStore(store.subscribe, store.getSnapshot);

  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
  }
  return `${seconds}s`;
}
