/**
 * FanGuide AI — Staff / Volunteer Dashboard Page
 *
 * Operational intelligence view for stadium staff. Shows:
 *   - Live crowd density heatmap (all zones)
 *   - Query category breakdown (aggregated, anonymized)
 *   - Urgent alerts (accessibility emergencies, injuries) — last 30 min
 *   - Total query volume — last 5 min
 *
 * This page is protected by a simple staff-mode toggle.
 * In production, replace with SSO/OAuth authentication.
 *
 * Privacy: No PII is displayed. Query records show only category,
 * timestamp, and a truncated session hash.
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../context/AppContext';
import type { DashboardData, QueryCategory, DensityLevel } from '../types';
import { clsx } from 'clsx';

const CATEGORY_ICONS: Record<QueryCategory, string> = {
  navigation: '🗺️',
  food: '🍔',
  restroom: '🚻',
  transit: '🚇',
  accessibility: '♿',
  emergency: '🚨',
  merchandise: '👕',
  other: '❓',
};

const DENSITY_LABELS: Record<DensityLevel, { label: string; class: string }> = {
  low: { label: 'Low', class: 'density-low' },
  medium: { label: 'Moderate', class: 'density-medium' },
  high: { label: 'High', class: 'density-high' },
};

export function DashboardPage() {
  const { t } = useTranslation();
  const { state, dispatch } = useAppContext();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  async function fetchDashboard() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/dashboard');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as DashboardData;
      setDashboardData(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!state.isStaffMode) return;
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 15_000); // Refresh every 15s
    return () => clearInterval(interval);
  }, [state.isStaffMode]);

  // ── Staff Mode Gate ──────────────────────────────────────────────────────
  if (!state.isStaffMode) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100dvh-4rem)] p-8 text-center gap-6">
        <div className="text-6xl" aria-hidden="true">🔐</div>
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">{t('dashboard.title')}</h1>
          <p className="text-stadium-light max-w-xs">
            This view is for authorized FIFA World Cup 2026 staff and volunteers only.
          </p>
        </div>
        <button
          onClick={() => dispatch({ type: 'TOGGLE_STAFF_MODE' })}
          className="px-6 py-3 bg-brand-500 hover:bg-brand-400 text-white font-semibold rounded-xl transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-400 shadow-brand-glow"
          aria-label="Enter staff mode to access dashboard"
        >
          {t('dashboard.staffMode')} →
        </button>
        <p className="text-xs text-stadium-light">
          In production, this requires staff authentication (SSO/OAuth).
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <span aria-hidden="true">📊</span>
            {t('dashboard.title')}
          </h1>
          {lastUpdated && (
            <p className="text-xs text-stadium-light mt-0.5">
              Updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchDashboard}
            disabled={isLoading}
            aria-label="Refresh dashboard"
            className="px-3 py-1.5 text-xs bg-stadium-card border border-stadium-border rounded-lg text-gray-300 hover:text-white transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-400 disabled:opacity-50"
          >
            {isLoading ? '⟳ Updating...' : '↻ Refresh'}
          </button>
          <button
            onClick={() => dispatch({ type: 'TOGGLE_STAFF_MODE' })}
            className="px-3 py-1.5 text-xs bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 hover:text-white transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-400"
          >
            Exit
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/40 rounded-xl p-4 text-red-300 text-sm" role="alert">
          {error}
        </div>
      )}

      {dashboardData && (
        <>
          {/* ── Urgent Alerts ──────────────────────────────────────────────── */}
          <section className="space-y-2" aria-labelledby="urgent-heading">
            <h2 id="urgent-heading" className="text-sm font-semibold text-red-400 flex items-center gap-2">
              <span aria-hidden="true">🚨</span> {t('dashboard.urgent')}
            </h2>

            {dashboardData.urgentAlerts.length === 0 ? (
              <div className="glass-card rounded-xl p-4 text-sm text-green-400 flex items-center gap-2">
                <span aria-hidden="true">✅</span>
                {t('dashboard.noUrgent')}
              </div>
            ) : (
              <ul className="space-y-2" aria-label="Urgent alerts list">
                {dashboardData.urgentAlerts.slice(0, 5).map((alert, idx) => (
                  <li
                    key={idx}
                    className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-center justify-between"
                    role="alert"
                  >
                    <div className="flex items-center gap-2">
                      <span aria-hidden="true">{CATEGORY_ICONS[alert.category]}</span>
                      <div>
                        <p className="text-sm font-medium text-red-200 capitalize">
                          {alert.category}
                        </p>
                        <p className="text-xs text-stadium-light">
                          Session: ···{alert.sessionHash.slice(-4)}
                        </p>
                      </div>
                    </div>
                    <time className="text-xs text-stadium-light" dateTime={alert.timestamp}>
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ── Query Volume ────────────────────────────────────────────────── */}
          <section className="glass-card rounded-xl p-4 space-y-3" aria-labelledby="query-heading">
            <div className="flex items-center justify-between">
              <h2 id="query-heading" className="text-sm font-semibold text-gold-400 flex items-center gap-2">
                <span aria-hidden="true">💬</span> {t('dashboard.queries')}
              </h2>
              <div
                className="text-xs bg-brand-500/20 text-brand-300 border border-brand-500/30 px-2 py-1 rounded-full"
                aria-label={`${dashboardData.totalQueriesLast5Min} queries in last 5 minutes`}
              >
                <strong>{dashboardData.totalQueriesLast5Min}</strong> {t('dashboard.last5min')}
              </div>
            </div>

            <div className="space-y-2">
              {Object.entries(dashboardData.queryCounts)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .map(([category, count]) => {
                  const total = Object.values(dashboardData.queryCounts).reduce((acc: number, val: unknown) => acc + (val as number), 0);
                  const pct = total > 0 ? Math.round(((count as number) / total) * 100) : 0;

                  return (
                    <div key={category} className="flex items-center gap-3">
                      <span className="text-sm w-5" aria-hidden="true">
                        {CATEGORY_ICONS[category as QueryCategory]}
                      </span>
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="text-gray-300 capitalize">{category}</span>
                          <span className="text-stadium-light">{count} ({pct}%)</span>
                        </div>
                        <div
                          className="h-1.5 bg-stadium-dark rounded-full overflow-hidden"
                          role="progressbar"
                          aria-valuenow={pct}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${category}: ${pct}%`}
                        >
                          <div
                            className={clsx(
                              'h-full rounded-full transition-all duration-700',
                              category === 'emergency' ? 'bg-red-500' :
                              category === 'accessibility' ? 'bg-blue-500' :
                              'bg-brand-500'
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>

          {/* ── Crowd Density Heatmap ───────────────────────────────────────── */}
          <section className="glass-card rounded-xl p-4 space-y-3" aria-labelledby="crowd-heading">
            <h2 id="crowd-heading" className="text-sm font-semibold text-gold-400 flex items-center gap-2">
              <span aria-hidden="true">👥</span> {t('dashboard.crowdMap')}
            </h2>

            <div className="grid grid-cols-2 gap-2">
               {Object.entries(dashboardData.crowdDensity.zones)
                .sort(([, a], [, b]) => {
                  const order = { high: 0, medium: 1, low: 2 } as Record<string, number>;
                  return order[(a as any).density] - order[(b as any).density];
                })
                .map(([zoneId, zone]) => {
                  const zoneData = zone as any;
                  return (
                  <div
                    key={zoneId}
                    className={clsx(
                      'flex items-center justify-between px-3 py-2 rounded-lg border text-xs',
                      DENSITY_LABELS[zoneData.density as DensityLevel].class
                    )}
                    aria-label={`${zoneData.zoneLabel}: ${zoneData.density} crowd density`}
                  >
                    <span className="font-medium truncate">{zoneData.zoneLabel}</span>
                    <span className="flex-shrink-0 ml-2 capitalize font-bold">
                      {DENSITY_LABELS[zoneData.density as DensityLevel].label}
                    </span>
                  </div>
                ); })}
            </div>
          </section>

          <p className="text-xs text-stadium-light text-center">
            ⚠️ Dashboard shows anonymized aggregate data only. No personal information is displayed.
          </p>
        </>
      )}

      {!dashboardData && !error && !isLoading && (
        <div className="text-center text-stadium-light text-sm py-8">
          <div className="text-4xl mb-3" aria-hidden="true">📡</div>
          Loading operational data...
        </div>
      )}
    </div>
  );
}
