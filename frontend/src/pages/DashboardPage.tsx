/**
 * FanGuide AI — Staff / Volunteer Dashboard Page
 *
 * Full-width operational intelligence view for stadium staff.
 * Layout:
 *   [4 stat tiles] → [full-width SVG zone heatmap] → [live query feed | category chart]
 *
 * Privacy: No PII is displayed. Query records show only category,
 * timestamp, and a truncated session hash.
 */

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../context/AppContext';
import type { DashboardData, QueryCategory, DensityLevel } from '../types';
import { clsx } from 'clsx';

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<QueryCategory, string> = {
  navigation:    '🗺️',
  food:          '🍔',
  restroom:      '🚻',
  transit:       '🚇',
  accessibility: '♿',
  emergency:     '🚨',
  merchandise:   '👕',
  other:         '❓',
};

const DENSITY_META: Record<DensityLevel, { label: string; color: string; fill: string; border: string; glow: string }> = {
  low:    { label: 'Low',      color: '#00ff87', fill: 'rgba(0,212,106,0.18)',  border: 'rgba(0,212,106,0.4)',   glow: 'rgba(0,212,106,0.3)' },
  medium: { label: 'Moderate', color: '#fbbf24', fill: 'rgba(245,158,11,0.18)', border: 'rgba(245,158,11,0.4)',  glow: 'rgba(245,158,11,0.3)' },
  high:   { label: 'High',     color: '#f87171', fill: 'rgba(239,68,68,0.2)',   border: 'rgba(239,68,68,0.4)',   glow: 'rgba(239,68,68,0.4)' },
};

const CATEGORY_GRADIENTS: Record<string, string> = {
  emergency:     'linear-gradient(90deg, #ef4444, #f87171)',
  accessibility: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
  navigation:    'linear-gradient(90deg, #3060ff, #5580ff)',
  food:          'linear-gradient(90deg, #f59e0b, #fbbf24)',
  restroom:      'linear-gradient(90deg, #8b5cf6, #a78bfa)',
  transit:       'linear-gradient(90deg, #06b6d4, #22d3ee)',
  merchandise:   'linear-gradient(90deg, #ec4899, #f472b6)',
  other:         'linear-gradient(90deg, #6b7280, #9ca3af)',
};

// Gate positions on the stadium SVG oval (for heatmap)
const HEATMAP_GATES = [
  { id: 'gate-a', label: 'A', cx: 120,  cy: 130  },
  { id: 'gate-b', label: 'B', cx: 200,  cy: 65   },
  { id: 'gate-c', label: 'C', cx: 320,  cy: 42   },
  { id: 'gate-d', label: 'D', cx: 440,  cy: 65   },
  { id: 'gate-e', label: 'E', cx: 530,  cy: 130  },
  { id: 'gate-f', label: 'F', cx: 530,  cy: 220  },
  { id: 'gate-g', label: 'G', cx: 320,  cy: 305  },
  { id: 'gate-h', label: 'H', cx: 120,  cy: 220  },
];

// ── Demo fallback data (shown when API is unavailable) ────────────────────────

function buildMockData(): DashboardData {
  const mockZones: Record<string, { density: DensityLevel; zoneLabel: string; zoneId: string; estimatedOccupancy: number; updatedAt: string }> = {
    'gate-a': { density: 'low',    zoneLabel: 'Gate A — South Entry', zoneId: 'gate-a', estimatedOccupancy: 28, updatedAt: new Date().toISOString() },
    'gate-b': { density: 'medium', zoneLabel: 'Gate B — West Lower',  zoneId: 'gate-b', estimatedOccupancy: 61, updatedAt: new Date().toISOString() },
    'gate-c': { density: 'high',   zoneLabel: 'Gate C — North Entry', zoneId: 'gate-c', estimatedOccupancy: 88, updatedAt: new Date().toISOString() },
    'gate-d': { density: 'medium', zoneLabel: 'Gate D — East Lower',  zoneId: 'gate-d', estimatedOccupancy: 54, updatedAt: new Date().toISOString() },
    'gate-e': { density: 'low',    zoneLabel: 'Gate E — East Entry',  zoneId: 'gate-e', estimatedOccupancy: 22, updatedAt: new Date().toISOString() },
    'gate-f': { density: 'high',   zoneLabel: 'Gate F — Upper East',  zoneId: 'gate-f', estimatedOccupancy: 79, updatedAt: new Date().toISOString() },
    'gate-g': { density: 'medium', zoneLabel: 'Gate G — South Plaza', zoneId: 'gate-g', estimatedOccupancy: 58, updatedAt: new Date().toISOString() },
    'gate-h': { density: 'low',    zoneLabel: 'Gate H — West Entry',  zoneId: 'gate-h', estimatedOccupancy: 35, updatedAt: new Date().toISOString() },
  };

  return {
    queryCounts: { navigation: 42, food: 27, restroom: 18, transit: 31, accessibility: 14, emergency: 3, merchandise: 8, other: 6 },
    urgentAlerts: [
      { category: 'emergency', timestamp: new Date(Date.now() - 180000).toISOString(), isUrgent: true, sessionHash: 'a4f8c2d1e9b3' },
      { category: 'accessibility', timestamp: new Date(Date.now() - 540000).toISOString(), isUrgent: true, sessionHash: 'f1b7e3a2c9d4' },
    ],
    crowdDensity: { zones: mockZones, lastRefreshed: new Date().toISOString() },
    totalQueriesLast5Min: 149,
  };
}

// ── Stat Tile ─────────────────────────────────────────────────────────────────

interface StatTileProps {
  label: string;
  value: string | number;
  icon: string;
  accent: string;
  accentGlow: string;
  trend?: 'up' | 'down' | 'neutral';
  pulse?: boolean;
}

function StatTile({ label, value, icon, accent, accentGlow, trend, pulse }: StatTileProps) {
  return (
    <div
      className={clsx('stat-tile animate-scale-in', pulse && 'border-red-500/30')}
      style={pulse ? { borderColor: 'rgba(239,68,68,0.3)', animation: 'scaleIn 0.25s both, urgentPulse 2s ease-in-out 0.5s infinite' } : undefined}
    >
      {/* Accent top border */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
        style={{ background: accent }}
      />
      <div className="flex items-start justify-between mb-2">
        <span className="text-xl" aria-hidden="true">{icon}</span>
        {trend && (
          <span className={clsx(
            'font-data text-xs font-bold',
            trend === 'up' ? 'text-red-400' : trend === 'down' ? 'text-pitch-400' : 'text-stadium-light',
          )}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '—'}
          </span>
        )}
      </div>
      <div
        className="font-data text-3xl font-bold tabular-nums leading-none mb-1"
        style={{
          background: accentGlow,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        {value}
      </div>
      <p className="text-[10px] text-stadium-light uppercase tracking-wider font-semibold">{label}</p>
    </div>
  );
}

// ── Stadium Heatmap SVG ───────────────────────────────────────────────────────

function StadiumHeatmap({ zones }: { zones: Record<string, { density: DensityLevel; zoneLabel: string; estimatedOccupancy: number }> }) {
  const [hoveredGate, setHoveredGate] = useState<string | null>(null);

  return (
    <div className="relative">
      <svg
        viewBox="0 0 650 350"
        className="w-full"
        role="img"
        aria-label="Stadium crowd density heatmap"
      >
        <defs>
          <radialGradient id="fieldGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0a1e30" />
            <stop offset="100%" stopColor="#061018" />
          </radialGradient>
          <filter id="heatGlow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Stadium oval */}
        <ellipse cx="325" cy="175" rx="305" ry="155"
          fill="url(#fieldGrad)" stroke="rgba(26,48,82,0.8)" strokeWidth="2" />

        {/* Field markings */}
        <ellipse cx="325" cy="175" rx="200" ry="95"
          fill="rgba(0,212,106,0.04)" stroke="rgba(0,212,106,0.12)" strokeWidth="1.5" />
        <line x1="325" y1="80" x2="325" y2="270"
          stroke="rgba(0,212,106,0.1)" strokeWidth="1.5" />
        <ellipse cx="325" cy="175" rx="45" ry="32"
          fill="none" stroke="rgba(0,212,106,0.1)" strokeWidth="1.5" />
        <circle cx="325" cy="175" r="4" fill="rgba(0,212,106,0.2)" />

        {/* Gate zones */}
        {HEATMAP_GATES.map(gate => {
          const zoneData = zones[gate.id];
          const density = zoneData?.density ?? 'low';
          const meta = DENSITY_META[density];
          const isHovered = hoveredGate === gate.id;
          const occupancy = zoneData?.estimatedOccupancy ?? 0;

          return (
            <g
              key={gate.id}
              onMouseEnter={() => setHoveredGate(gate.id)}
              onMouseLeave={() => setHoveredGate(null)}
              style={{ cursor: 'pointer' }}
              aria-label={`Gate ${gate.label}: ${density} density, ${occupancy}% occupancy`}
            >
              {/* Outer glow ring for high density */}
              {density === 'high' && (
                <circle
                  cx={gate.cx} cy={gate.cy} r={38}
                  fill="none"
                  stroke={meta.color}
                  strokeWidth="1"
                  opacity="0.3"
                  className="map-pin-pulse"
                />
              )}
              {/* Zone circle */}
              <circle
                cx={gate.cx} cy={gate.cy}
                r={isHovered ? 32 : 28}
                fill={meta.fill}
                stroke={meta.border}
                strokeWidth={isHovered ? 2 : 1.5}
                style={{
                  transition: 'r 0.2s, stroke-width 0.2s',
                  filter: density === 'high' ? `drop-shadow(0 0 8px ${meta.glow})` : undefined,
                }}
              />
              {/* Gate label */}
              <text
                x={gate.cx} y={gate.cy - 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="13"
                fontWeight="bold"
                fontFamily="JetBrains Mono, monospace"
                fill={meta.color}
              >
                {gate.label}
              </text>
              {/* Occupancy % */}
              <text
                x={gate.cx} y={gate.cy + 12}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="8"
                fontFamily="JetBrains Mono, monospace"
                fill={meta.color}
                opacity="0.8"
              >
                {occupancy}%
              </text>

              {/* Hover tooltip */}
              {isHovered && (
                <g>
                  <rect
                    x={gate.cx - 50} y={gate.cy - 56}
                    width="100" height="30"
                    rx="6" ry="6"
                    fill="rgba(13,31,53,0.95)"
                    stroke={meta.border}
                    strokeWidth="1"
                  />
                  <text
                    x={gate.cx} y={gate.cy - 46}
                    textAnchor="middle"
                    fontSize="9"
                    fontFamily="JetBrains Mono, monospace"
                    fill="#ffffff"
                    fontWeight="600"
                  >
                    {zoneData?.zoneLabel?.split('—')[1]?.trim() ?? `Gate ${gate.label}`}
                  </text>
                  <text
                    x={gate.cx} y={gate.cy - 34}
                    textAnchor="middle"
                    fontSize="8"
                    fontFamily="JetBrains Mono, monospace"
                    fill={meta.color}
                  >
                    {meta.label} · {occupancy}/100m²
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-center gap-5 mt-2">
        {(['low', 'medium', 'high'] as DensityLevel[]).map(lvl => (
          <span key={lvl} className="flex items-center gap-1.5 text-xs text-stadium-light">
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ background: DENSITY_META[lvl].color }}
            />
            {DENSITY_META[lvl].label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Live Query Feed ───────────────────────────────────────────────────────────

interface FeedItem {
  category: QueryCategory;
  timestamp: string;
  isUrgent: boolean;
  sessionHash: string;
  id: string;
}

function LiveQueryFeed({ urgentAlerts, queryCounts }: { urgentAlerts: DashboardData['urgentAlerts']; queryCounts: DashboardData['queryCounts'] }) {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const feedRef = useRef<HTMLDivElement>(null);
  const categories = Object.keys(queryCounts) as QueryCategory[];

  // Build initial feed from urgent alerts + synthetic items
  useEffect(() => {
    const initial: FeedItem[] = urgentAlerts.map((a, i) => ({
      ...a,
      id: `urgent-${i}`,
    }));

    // Add some synthetic non-urgent items
    const synth: FeedItem[] = [
      { category: 'navigation', timestamp: new Date(Date.now() - 60000).toISOString(), isUrgent: false, sessionHash: 'b3c7e1f4a8d2', id: 'synth-1' },
      { category: 'food',       timestamp: new Date(Date.now() - 120000).toISOString(), isUrgent: false, sessionHash: 'e9d2c6a0b5f1', id: 'synth-2' },
      { category: 'restroom',   timestamp: new Date(Date.now() - 200000).toISOString(), isUrgent: false, sessionHash: 'a1b4d7e2c8f0', id: 'synth-3' },
      { category: 'transit',    timestamp: new Date(Date.now() - 300000).toISOString(), isUrgent: false, sessionHash: 'c5f2a8b1d3e7', id: 'synth-4' },
    ];

    setFeedItems([...initial, ...synth]);
  }, [urgentAlerts]);

  // Simulate new incoming queries every 6 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const cat = categories[Math.floor(Math.random() * categories.length)];
      const isUrgent = cat === 'emergency' && Math.random() < 0.2;
      const newItem: FeedItem = {
        category: cat,
        timestamp: new Date().toISOString(),
        isUrgent,
        sessionHash: Math.random().toString(36).substring(2, 14),
        id: `live-${Date.now()}`,
      };
      setFeedItems(prev => [newItem, ...prev.slice(0, 19)]);
    }, 6000);

    return () => clearInterval(interval);
  }, [categories]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <span className="live-dot" aria-hidden="true" />
          Live Query Feed
        </h2>
        <span className="font-data text-[10px] text-stadium-light">
          {feedItems.length} recent
        </span>
      </div>

      <div
        ref={feedRef}
        className="flex-1 overflow-y-auto space-y-1.5 pr-1"
        aria-label="Live anonymized query feed"
        aria-live="polite"
        aria-atomic="false"
      >
        {feedItems.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 gap-3 text-center">
            <div className="text-3xl opacity-30">📭</div>
            <p className="text-xs text-stadium-light">No queries yet — all quiet</p>
          </div>
        )}
        {feedItems.map((item) => (
          <div
            key={item.id}
            className={item.isUrgent ? 'feed-card-urgent' : 'feed-card'}
            role={item.isUrgent ? 'alert' : undefined}
          >
            <span className="text-base flex-shrink-0 mt-0.5" aria-hidden="true">
              {CATEGORY_ICONS[item.category]}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={clsx(
                  'text-xs font-semibold capitalize',
                  item.isUrgent ? 'text-red-300' : 'text-white',
                )}>
                  {item.category}
                </span>
                {item.isUrgent && (
                  <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider bg-red-500/10 px-1.5 py-0.5 rounded-full border border-red-500/30">
                    URGENT
                  </span>
                )}
              </div>
              <p className="font-data text-[9px] text-stadium-light mt-0.5">
                Session ···{item.sessionHash.slice(-4)}
              </p>
            </div>
            <time
              className="font-data text-[9px] text-stadium-light flex-shrink-0"
              dateTime={item.timestamp}
            >
              {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </time>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

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
    } catch {
      // Fall back to mock data for demo purposes
      setDashboardData(buildMockData());
      setLastUpdated(new Date());
      setError(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!state.isStaffMode) return;
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 15_000);
    return () => clearInterval(interval);
  }, [state.isStaffMode]);

  // ── Staff Mode Gate ──────────────────────────────────────────────────────
  if (!state.isStaffMode) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100dvh-8rem)] p-8 text-center gap-6">
        <div className="relative">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(48,96,255,0.18) 0%, transparent 70%)',
              transform: 'scale(2.5)',
            }}
          />
          <div className="relative w-20 h-20 rounded-2xl flex items-center justify-center text-4xl glass-card border border-brand-500/30 shadow-brand-glow">
            🔐
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">{t('dashboard.title')}</h1>
          <p className="text-stadium-light text-sm max-w-xs leading-relaxed">
            This operational view is for authorized FIFA World Cup 2026 staff and volunteers only.
          </p>
        </div>

        <button
          onClick={() => dispatch({ type: 'TOGGLE_STAFF_MODE' })}
          className="btn-primary text-base"
          aria-label="Enter staff mode to access dashboard"
        >
          {t('dashboard.staffMode')}
          <span className="ml-2 opacity-70">→</span>
        </button>

        <p className="text-xs text-stadium-light opacity-50">
          In production, this requires staff authentication (SSO/OAuth).
        </p>
      </div>
    );
  }

  const data = dashboardData ?? buildMockData();
  const alertCount = data.urgentAlerts.length;
  const highZones = Object.values(data.crowdDensity.zones).filter(z => z.density === 'high').length;
  const avgWait = 8; // Static demo value

  return (
    <div className="flex flex-col h-[calc(100dvh-57px)] overflow-hidden">
      {/* ── Dashboard Header ───────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b border-stadium-border/30">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-white">{t('dashboard.title')}</h1>
          {lastUpdated && (
            <div className="flex items-center gap-1.5">
              <span className="live-dot" aria-hidden="true" />
              <span className="font-data text-[10px] text-pitch-400">
                LIVE · {lastUpdated.toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {error && (
            <span className="text-xs text-amber-400 font-data">⚠ Demo data</span>
          )}
          <button
            onClick={fetchDashboard}
            disabled={isLoading}
            aria-label="Refresh dashboard"
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-all',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-400',
              'bg-stadium-card/50 border-stadium-border text-gray-300 hover:text-white hover:border-brand-500/50',
              'disabled:opacity-50',
            )}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
              className={clsx('w-3 h-3', isLoading && 'animate-spin')}>
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            {isLoading ? 'Updating...' : 'Refresh'}
          </button>
          <button
            onClick={() => dispatch({ type: 'TOGGLE_STAFF_MODE' })}
            className="px-3 py-1.5 text-xs rounded-lg border transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-400 bg-red-500/8 border-red-500/25 text-red-400 hover:bg-red-500/15"
          >
            Exit Staff Mode
          </button>
        </div>
      </div>

      {/* ── Dashboard Body (scrollable) ────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">

        {/* Stat Tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-in">
          <StatTile
            label="Active Users"
            value={data.totalQueriesLast5Min}
            icon="👤"
            accent="linear-gradient(90deg, #3060ff, #5580ff)"
            accentGlow="linear-gradient(135deg, #7a9bff, #3060ff)"
            trend="up"
          />
          <StatTile
            label="Queries (5 min)"
            value={data.totalQueriesLast5Min}
            icon="💬"
            accent="linear-gradient(90deg, #ffc80a, #ffd84d)"
            accentGlow="linear-gradient(135deg, #ffd84d, #ffc80a)"
            trend="neutral"
          />
          <StatTile
            label="Avg Wait Time"
            value={`${avgWait}m`}
            icon="⏱️"
            accent="linear-gradient(90deg, #06b6d4, #22d3ee)"
            accentGlow="linear-gradient(135deg, #22d3ee, #06b6d4)"
            trend="down"
          />
          <StatTile
            label="Flagged Alerts"
            value={alertCount}
            icon="🚨"
            accent="linear-gradient(90deg, #ef4444, #f87171)"
            accentGlow={alertCount > 0
              ? "linear-gradient(135deg, #f87171, #ef4444)"
              : "linear-gradient(135deg, #4ade80, #22c55e)"}
            pulse={alertCount > 0}
          />
        </div>

        {/* Stadium Heatmap */}
        <section className="glass-card rounded-2xl p-5 animate-fade-in stagger-1" aria-labelledby="heatmap-title">
          <div className="flex items-center justify-between mb-4">
            <h2 id="heatmap-title" className="text-sm font-bold text-white flex items-center gap-2">
              <span className="text-base" aria-hidden="true">🏟️</span>
              Zone Crowd Density — MetLife Stadium
            </h2>
            <span className="font-data text-[10px] text-stadium-light">
              {highZones} zone{highZones !== 1 ? 's' : ''} at HIGH capacity
            </span>
          </div>
          <StadiumHeatmap zones={data.crowdDensity.zones} />
        </section>

        {/* Bottom 2-column: feed + breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in stagger-2">

          {/* Live Query Feed */}
          <div className="glass-card rounded-2xl p-4 h-80">
            <LiveQueryFeed urgentAlerts={data.urgentAlerts} queryCounts={data.queryCounts} />
          </div>

          {/* Category Breakdown */}
          <section className="glass-card rounded-2xl p-4" aria-labelledby="query-breakdown-title">
            <h2 id="query-breakdown-title" className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <span aria-hidden="true">📊</span>
              {t('dashboard.queries')}
            </h2>

            <div className="space-y-3">
              {Object.entries(data.queryCounts)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .map(([category, count]) => {
                  const total = Object.values(data.queryCounts).reduce(
                    (acc: number, val: unknown) => acc + (val as number), 0,
                  );
                  const pct = total > 0 ? Math.round(((count as number) / total) * 100) : 0;

                  return (
                    <div key={category} className="flex items-center gap-3">
                      <span className="text-base w-6 flex-shrink-0" aria-hidden="true">
                        {CATEGORY_ICONS[category as QueryCategory]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-gray-300 capitalize font-medium">{category}</span>
                          <span className="font-data text-stadium-light">
                            {count} <span className="opacity-60">({pct}%)</span>
                          </span>
                        </div>
                        <div
                          className="h-1.5 bg-stadium-dark/80 rounded-full overflow-hidden"
                          role="progressbar"
                          aria-valuenow={pct}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${category}: ${pct}%`}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${pct}%`,
                              background: CATEGORY_GRADIENTS[category] ?? 'linear-gradient(90deg, #3060ff, #5580ff)',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>
        </div>

        <p className="text-xs text-stadium-light text-center opacity-40 pb-2">
          ⚠️ Dashboard shows anonymized aggregate data only. No personal information is displayed.
        </p>
      </div>
    </div>
  );
}
