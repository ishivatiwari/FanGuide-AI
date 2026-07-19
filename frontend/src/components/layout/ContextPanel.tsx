/**
 * FanGuide AI — Live Context Panel (Right Panel)
 *
 * Persistent right-side panel visible on the Chat page.
 * Renders 4 live zones:
 *   1. Mini SVG stadium map with user's zone pinned + pulsing dot
 *   2. Live crowd-density strip (color-coded per zone, updates on interval)
 *   3. Kickoff countdown widget (monospace, auto-ticking)
 *   4. Latest tool result card (animated slide-in when a tool fires)
 *
 * Accessibility:
 *   - aria-label on each section
 *   - aria-live="polite" on density strip and countdown
 *   - Reduced motion: animations collapse when prefers-reduced-motion
 */

import React, { useState, useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import type { ToolCallAttachment, RouteResult } from '../../types';

// ── Types ──────────────────────────────────────────────────────────────────────

type DensityLevel = 'low' | 'medium' | 'high';

interface ZoneData {
  id: string;
  label: string;
  density: DensityLevel;
  pct: number; // 0–100
}

interface ContextPanelProps {
  /** Latest tool attachment from the chat — drives the active result card */
  latestToolAttachment?: ToolCallAttachment | null;
  /** User's current zone (from chatContext) */
  userZone?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

// Demo target: FIFA World Cup 2026 opening match
const KICKOFF_TARGET = new Date('2026-06-11T20:00:00-04:00');

const DENSITY_COLORS: Record<DensityLevel, { fill: string; text: string; bar: string; glow: string }> = {
  low:    { fill: 'rgba(0,212,106,0.18)',  text: '#00ff87', bar: '#00d46a', glow: 'rgba(0,212,106,0.35)' },
  medium: { fill: 'rgba(245,158,11,0.18)', text: '#fbbf24', bar: '#f59e0b', glow: 'rgba(245,158,11,0.35)' },
  high:   { fill: 'rgba(239,68,68,0.18)',  text: '#f87171', bar: '#ef4444', glow: 'rgba(239,68,68,0.35)' },
};

// ── Mock zone data (cycles to simulate live updates) ──────────────────────────

const ZONE_SETS: ZoneData[][] = [
  [
    { id: 'gate-a', label: 'Gate A · Z1', density: 'low',    pct: 28 },
    { id: 'gate-b', label: 'Gate B · Z2', density: 'medium', pct: 61 },
    { id: 'gate-c', label: 'Gate C · Z3', density: 'high',   pct: 88 },
    { id: 'gate-d', label: 'Gate D · Z4', density: 'medium', pct: 54 },
    { id: 'gate-e', label: 'Gate E · Z5', density: 'low',    pct: 22 },
  ],
  [
    { id: 'gate-a', label: 'Gate A · Z1', density: 'medium', pct: 47 },
    { id: 'gate-b', label: 'Gate B · Z2', density: 'high',   pct: 82 },
    { id: 'gate-c', label: 'Gate C · Z3', density: 'high',   pct: 91 },
    { id: 'gate-d', label: 'Gate D · Z4', density: 'low',    pct: 31 },
    { id: 'gate-e', label: 'Gate E · Z5', density: 'medium', pct: 58 },
  ],
  [
    { id: 'gate-a', label: 'Gate A · Z1', density: 'low',    pct: 19 },
    { id: 'gate-b', label: 'Gate B · Z2', density: 'low',    pct: 34 },
    { id: 'gate-c', label: 'Gate C · Z3', density: 'medium', pct: 67 },
    { id: 'gate-d', label: 'Gate D · Z4', density: 'high',   pct: 79 },
    { id: 'gate-e', label: 'Gate E · Z5', density: 'medium', pct: 55 },
  ],
];

// Zone positions on the SVG oval (cx, cy for each gate label)
const GATE_POSITIONS: Record<string, { x: number; y: number; label: string }> = {
  'gate-a': { x: 100, y: 100, label: 'A' },
  'gate-b': { x: 190, y: 54,  label: 'B' },
  'gate-c': { x: 300, y: 42,  label: 'C' },
  'gate-d': { x: 410, y: 54,  label: 'D' },
  'gate-e': { x: 500, y: 100, label: 'E' },
  'gate-f': { x: 500, y: 180, label: 'F' },
  'gate-g': { x: 300, y: 224, label: 'G' },
  'gate-h': { x: 100, y: 180, label: 'H' },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function CountdownWidget() {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0, total: 0 });

  useEffect(() => {
    function tick() {
      const diff = KICKOFF_TARGET.getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ d: 0, h: 0, m: 0, s: 0, total: 0 });
        return;
      }
      setTimeLeft({
        total: diff,
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <section
      className="panel-card p-3"
      aria-label={t('panel.kickoffIn')}
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-gold-400">
          ⚽ {t('panel.kickoffIn').toUpperCase()}
        </span>
        <span className="live-dot flex-shrink-0 ml-auto" aria-hidden="true" />
      </div>
      <div className="flex items-end gap-1.5">
        {[
          { value: timeLeft.d, unit: 'D', keyName: 'days' },
          { value: timeLeft.h, unit: 'H', keyName: 'hours' },
          { value: timeLeft.m, unit: 'M', keyName: 'minutes' },
          { value: timeLeft.s, unit: 'S', keyName: 'seconds' },
        ].map(({ value, unit, keyName }, i) => (
          <React.Fragment key={unit}>
            {i > 0 && (
              <span className="text-gold-600 font-data text-lg font-bold mb-1">:</span>
            )}
            <div className="flex flex-col items-center">
              <span
                className="font-data text-2xl font-bold text-white tabular-nums leading-none"
                style={{ textShadow: '0 0 20px rgba(255,200,10,0.4)' }}
              >
                {pad(value)}
              </span>
              <span className="text-[8px] text-stadium-light font-bold tracking-widest uppercase mt-0.5">
                {t(`panel.unit.${keyName}`)}
              </span>
            </div>
          </React.Fragment>
        ))}
      </div>
      <p className="text-[9px] text-stadium-light mt-1.5 truncate">
        MetLife Stadium · Jun 11, 2026 · 8:00 PM ET
      </p>
    </section>
  );
}

function StadiumMiniMap({ zones, userZone }: { zones: ZoneData[]; userZone: string }) {
  const { t } = useTranslation();
  const densityByGate: Record<string, DensityLevel> = {};
  zones.forEach(z => { densityByGate[z.id] = z.density; });

  const userGate = userZone?.toLowerCase().replace('gate ', 'gate-') || 'gate-a';

  return (
    <section className="panel-card p-3" aria-label={t('map.title')}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-stadium-light">
          📍 {t('map.title').toUpperCase()}
        </span>
        <span className="zone-badge density-low text-pitch-400">
          {userZone}
        </span>
      </div>
      <div className="relative">
        <svg viewBox="0 0 600 270" className="w-full" aria-label="Stadium overhead map">
          {/* Stadium oval background */}
          <defs>
            <radialGradient id="stadiumGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0d1f35" />
              <stop offset="100%" stopColor="#061018" />
            </radialGradient>
            <filter id="gateGlow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Outer oval */}
          <ellipse cx="300" cy="135" rx="280" ry="120"
            fill="url(#stadiumGrad)" stroke="rgba(48,96,255,0.3)" strokeWidth="1.5" />

          {/* Pitch lines (very faint) */}
          <ellipse cx="300" cy="135" rx="200" ry="80"
            fill="rgba(0,212,106,0.04)" stroke="rgba(0,212,106,0.15)" strokeWidth="1" />
          <line x1="300" y1="55" x2="300" y2="215"
            stroke="rgba(0,212,106,0.1)" strokeWidth="1" />
          <ellipse cx="300" cy="135" rx="40" ry="28"
            fill="none" stroke="rgba(0,212,106,0.1)" strokeWidth="1" />

          {/* Gate zones — colored by density */}
          {Object.entries(GATE_POSITIONS).map(([gateId, pos]) => {
            const density = densityByGate[gateId] ?? 'low';
            const colors = DENSITY_COLORS[density];
            const isUser = gateId === userGate;

            return (
              <g key={gateId} aria-label={`Gate ${pos.label}: ${density} density`}>
                {/* Zone circle */}
                <circle
                  cx={pos.x} cy={pos.y} r={isUser ? 24 : 18}
                  fill={colors.fill}
                  stroke={isUser ? '#ffc80a' : colors.bar}
                  strokeWidth={isUser ? 2 : 1}
                  opacity={0.85}
                  style={isUser ? { filter: `drop-shadow(0 0 8px ${colors.glow})` } : undefined}
                />
                {/* Gate label */}
                <text
                  x={pos.x} y={pos.y + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={isUser ? 12 : 10}
                  fontWeight="bold"
                  fontFamily="JetBrains Mono, monospace"
                  fill={isUser ? '#ffc80a' : colors.text}
                >
                  {pos.label}
                </text>

                {/* Pulsing ring for user zone */}
                {isUser && (
                  <circle
                    cx={pos.x} cy={pos.y} r={32}
                    fill="none"
                    stroke="#ffc80a"
                    strokeWidth="1"
                    opacity="0.5"
                    className="map-pin-pulse"
                  />
                )}
              </g>
            );
          })}

          {/* "YOU" label for user gate */}
          {userGate && GATE_POSITIONS[userGate] && (
            <text
              x={GATE_POSITIONS[userGate].x}
              y={GATE_POSITIONS[userGate].y - 32}
              textAnchor="middle"
              fontSize="8"
              fontWeight="bold"
              fontFamily="JetBrains Mono, monospace"
              fill="#ffc80a"
              letterSpacing="1"
            >
              {t('panel.you').toUpperCase()}
            </text>
          )}
        </svg>

        {/* Legend */}
        <div className="flex items-center justify-center gap-3 mt-1">
          {(['low', 'medium', 'high'] as DensityLevel[]).map(lvl => (
            <span key={lvl} className="flex items-center gap-1 text-[9px] text-stadium-light">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ background: DENSITY_COLORS[lvl].bar }}
              />
              {t(`panel.legend.${lvl}`)}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function DensityStrip({ zones, isUpdating }: { zones: ZoneData[]; isUpdating: boolean }) {
  const { t } = useTranslation();
  return (
    <section
      className="panel-card p-3"
      aria-label={t('panel.crowdDensity')}
      aria-live="polite"
      aria-atomic="false"
    >
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-stadium-light">
          👥 {t('panel.crowdDensity').toUpperCase()}
        </span>
        <span className={clsx(
          'live-dot flex-shrink-0 ml-auto',
          isUpdating && 'opacity-60'
        )} aria-hidden="true" />
      </div>
      <div className="space-y-2">
        {zones.map((zone) => {
          const colors = DENSITY_COLORS[zone.density];
          return (
            <div key={zone.id} aria-label={`${zone.label}: ${t(`panel.legend.${zone.density}`)} at ${zone.pct}%`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-data text-[10px] text-gray-300 tracking-tight">
                  {zone.label}
                </span>
                <span
                  className="font-data text-[9px] font-bold uppercase tracking-wider"
                  style={{ color: colors.text }}
                >
                  {t(`panel.legend.${zone.density}`)}
                </span>
              </div>
              <div className="h-1.5 bg-stadium-dark rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${zone.pct}%`,
                    background: colors.bar,
                    boxShadow: zone.pct > 70 ? `0 0 6px ${colors.glow}` : 'none',
                  }}
                  role="progressbar"
                  aria-valuenow={zone.pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[9px] text-stadium-light mt-2 font-data">
        {t('panel.updated')} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </p>
    </section>
  );
}

function RouteResultCard({ route }: { route: RouteResult }) {
  const { t } = useTranslation();
  const totalMin = Math.ceil(route.totalDurationSeconds / 60);

  return (
    <section
      className="panel-card p-3 animate-card-enter"
      aria-label={t('panel.yourRoute')}
      style={{ animation: 'cardEnter 0.45s cubic-bezier(0.34,1.4,0.64,1) both' }}
    >
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-gold-400">
          🗺️ {t('panel.yourRoute').toUpperCase()}
        </span>
        <span className="font-data text-xs font-bold text-gold-400">
          ~{totalMin} {t('route.minutes')}
        </span>
      </div>

      {/* Step list */}
      <div className="space-y-2">
        {route.steps.map((step, i) => (
          <div key={i} className="relative flex items-start gap-2 pl-5">
            {/* Connector line */}
            {i < route.steps.length - 1 && (
              <div className="absolute left-2 top-5 bottom-0 w-px bg-stadium-border" />
            )}
            {/* Step dot */}
            <div
              className="absolute left-0 top-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
              style={{
                background: i === 0 ? 'rgba(255,200,10,0.2)' : i === route.steps.length - 1 ? 'rgba(0,212,106,0.2)' : 'rgba(48,96,255,0.15)',
                border: `1px solid ${i === 0 ? 'rgba(255,200,10,0.5)' : i === route.steps.length - 1 ? 'rgba(0,212,106,0.5)' : 'rgba(48,96,255,0.3)'}`,
              }}
            >
              {i + 1}
            </div>

            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-white truncate">
                {step.fromLabel}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-stadium-light">🚶</span>
                <span className="font-data text-[10px] text-stadium-light">
                  {t('route.via')} {step.via} · {Math.ceil(step.durationSeconds / 60)}{t('route.minutes')}
                </span>
                {step.accessible && (
                  <span className="text-[9px] text-pitch-400">♿</span>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Final destination */}
        {route.steps.length > 0 && (
          <div className="relative flex items-start gap-2 pl-5">
            <div
              className="absolute left-0 top-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px]"
              style={{ background: 'rgba(0,212,106,0.2)', border: '1px solid rgba(0,212,106,0.5)' }}
            >
              ✓
            </div>
            <p className="text-[11px] font-semibold text-pitch-400 truncate">
              {route.steps[route.steps.length - 1].toLabel}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function EmptyToolState() {
  const { t } = useTranslation();
  return (
    <section className="panel-card p-4 flex flex-col items-center text-center gap-2.5"
      aria-label={t('panel.guidanceReady')}>
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border border-brand-500/20 animate-ping" />
        <div className="w-10 h-10 rounded-full bg-brand-500/10 border border-brand-500/20
          flex items-center justify-center text-lg">
          🧭
        </div>
      </div>
      <div>
        <p className="text-[11px] font-semibold text-white">{t('panel.guidanceReady')}</p>
        <p className="text-[10px] text-stadium-light mt-0.5 leading-relaxed">
          {t('panel.guidanceDesc')}
        </p>
      </div>
      <div className="flex gap-1 mt-1">
        <span className="thinking-dot" />
        <span className="thinking-dot" />
        <span className="thinking-dot" />
      </div>
    </section>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function ContextPanel({ latestToolAttachment, userZone = 'Gate A' }: ContextPanelProps) {
  const { t } = useTranslation();
  const [isUpdating, setIsUpdating] = useState(false);
  const [displayZones, setDisplayZones] = useState<ZoneData[]>(ZONE_SETS[0]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cycle through mock density data every 8 seconds
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setIsUpdating(true);
      setTimeout(() => {
        setDisplayZones(prev => {
          const currentIndex = ZONE_SETS.indexOf(prev);
          const next = (currentIndex + 1) % ZONE_SETS.length;
          return ZONE_SETS[next];
        });
        setIsUpdating(false);
      }, 400);
    }, 8000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Try to parse a route result from tool attachments
  let routeResult: RouteResult | null = null;
  if (latestToolAttachment?.name === 'getRoute' && latestToolAttachment.result && !latestToolAttachment.isError) {
    try {
      const r = latestToolAttachment.result as RouteResult;
      if (r.steps && r.steps.length > 0) routeResult = r;
    } catch {
      // ignore
    }
  }

  return (
    <aside
      className="flex flex-col gap-3 h-full overflow-y-auto py-4 px-3 animate-panel-in"
      aria-label={t('panel.liveContext')}
      role="complementary"
    >
      {/* Header label */}
      <div className="flex items-center gap-2 px-1">
        <span className="text-[9px] font-bold tracking-[0.25em] uppercase text-stadium-light">
          {t('panel.liveContext').toUpperCase()}
        </span>
        <div className="h-px flex-1 bg-stadium-border/60" />
        <span className="live-dot" aria-label="Live data" />
      </div>

      {/* 1. Kickoff Countdown */}
      <CountdownWidget />

      {/* 2. Stadium Mini Map */}
      <StadiumMiniMap zones={displayZones} userZone={userZone} />

      {/* 3. Crowd Density Strip */}
      <DensityStrip zones={displayZones} isUpdating={isUpdating} />

      {/* 4. Tool Result Card or Empty State */}
      {routeResult ? (
        <RouteResultCard route={routeResult} key={latestToolAttachment?.name} />
      ) : (
        <EmptyToolState />
      )}
    </aside>
  );
}
