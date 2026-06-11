import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Custom hook to track elapsed reading time per story session.
 * Pauses when mic is stopped, resumes when listening.
 */
export function useReadingTimer() {
  const [elapsedMs, setElapsedMs] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRunningRef = useRef(false);

  const start = useCallback(() => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    intervalRef.current = setInterval(() => {
      setElapsedMs((prev) => prev + 1000);
    }, 1000);
  }, []);

  const pause = useCallback(() => {
    isRunningRef.current = false;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    pause();
    setElapsedMs(0);
  }, [pause]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  /**
   * Returns a human-friendly formatted time string like "2m 34s" or "45s".
   */
  const getFormattedTime = useCallback((): string => {
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
    }
    return `${seconds}s`;
  }, [elapsedMs]);

  return {
    elapsedMs,
    start,
    pause,
    reset,
    getFormattedTime,
    isRunning: isRunningRef.current,
  };
}
