import { useState, useEffect, useRef, useCallback } from 'react';
import { TimerStatus } from '../../types/pitch';

interface UsePitchTimerProps {
  initialDurationSeconds: number;
  onComplete?: () => void;
}

export interface PitchTimerHandle {
  status: TimerStatus;
  remainingSeconds: number;
  totalSeconds: number;
  formattedTime: string;
  progressPercent: number;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  restart: () => void;
  setDuration: (seconds: number) => void;
}

export function usePitchTimer({
  initialDurationSeconds,
  onComplete,
}: UsePitchTimerProps): PitchTimerHandle {
  const [totalSeconds, setTotalSeconds] = useState<number>(initialDurationSeconds);
  const [remainingMs, setRemainingMs] = useState<number>(initialDurationSeconds * 1000);
  const [status, setStatus] = useState<TimerStatus>('idle');

  // Ref tracking absolute deadline to avoid background tab throttling drift
  const deadlineRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Sync if duration prop changes while idle
  useEffect(() => {
    if (status === 'idle') {
      setTotalSeconds(initialDurationSeconds);
      setRemainingMs(initialDurationSeconds * 1000);
    }
  }, [initialDurationSeconds, status]);

  const tick = useCallback(() => {
    if (!deadlineRef.current) return;

    const now = Date.now();
    const remaining = Math.max(0, deadlineRef.current - now);
    setRemainingMs(remaining);

    if (remaining <= 0) {
      deadlineRef.current = null;
      setStatus('completed');
      if (onCompleteRef.current) {
        onCompleteRef.current();
      }
    } else {
      animationFrameRef.current = requestAnimationFrame(tick);
    }
  }, []);

  const start = useCallback(() => {
    const currentRemaining = remainingMs > 0 ? remainingMs : totalSeconds * 1000;
    deadlineRef.current = Date.now() + currentRemaining;
    setStatus('running');
    animationFrameRef.current = requestAnimationFrame(tick);
  }, [remainingMs, totalSeconds, tick]);

  const pause = useCallback(() => {
    if (deadlineRef.current) {
      const remaining = Math.max(0, deadlineRef.current - Date.now());
      setRemainingMs(remaining);
      deadlineRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setStatus('paused');
  }, []);

  const resume = useCallback(() => {
    start();
  }, [start]);

  const reset = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    deadlineRef.current = null;
    setRemainingMs(totalSeconds * 1000);
    setStatus('idle');
  }, [totalSeconds]);

  const restart = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    const freshDuration = totalSeconds * 1000;
    setRemainingMs(freshDuration);
    deadlineRef.current = Date.now() + freshDuration;
    setStatus('running');
    animationFrameRef.current = requestAnimationFrame(tick);
  }, [totalSeconds, tick]);

  const setDuration = useCallback((seconds: number) => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    deadlineRef.current = null;
    setTotalSeconds(seconds);
    setRemainingMs(seconds * 1000);
    setStatus('idle');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const totalMs = totalSeconds * 1000;
  const progressPercent = totalMs > 0 ? Math.min(100, Math.max(0, ((totalMs - remainingMs) / totalMs) * 100)) : 0;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return {
    status,
    remainingSeconds,
    totalSeconds,
    formattedTime,
    progressPercent,
    start,
    pause,
    resume,
    reset,
    restart,
    setDuration,
  };
}
