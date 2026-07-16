/**
 * FanGuide AI — Crowd Density Polling Hook
 *
 * Polls the /api/crowd endpoint at a debounced interval to keep the
 * stadium map visualization and density badges up-to-date.
 *
 * Uses a configurable interval (default 30s) with a visibility check
 * so polling stops when the tab is hidden (efficient battery use).
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { CrowdDensityState } from '../types';

const DEFAULT_INTERVAL_MS = 30_000;

interface UseCrowdDensityReturn {
  crowdData: CrowdDensityState | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useCrowdDensity(
  intervalMs = DEFAULT_INTERVAL_MS
): UseCrowdDensityReturn {
  const [crowdData, setCrowdData] = useState<CrowdDensityState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchDensity = useCallback(async () => {
    // Don't poll when tab is hidden (efficiency)
    if (document.visibilityState === 'hidden') return;

    try {
      const res = await fetch('/api/crowd');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as CrowdDensityState;
      setCrowdData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch crowd data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDensity();

    intervalRef.current = setInterval(fetchDensity, intervalMs);

    // Pause/resume on visibility change
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchDensity();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchDensity, intervalMs]);

  return { crowdData, isLoading, error, refetch: fetchDensity };
}
