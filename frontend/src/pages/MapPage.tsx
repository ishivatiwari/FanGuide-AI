/**
 * FanGuide AI — Stadium Map Page
 *
 * Renders an SVG stadium map with:
 *   - Zones colored by crowd density (green/amber/red)
 *   - Highlighted route if one is active
 *   - Node labels on hover/focus
 *   - Legend for density colors
 *
 * The SVG is fully accessible:
 *   - Role="img" with aria-labelledby
 *   - Each zone has a title element and aria-label
 *   - Keyboard focusable zones with focus styles
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useCrowdDensity } from '../hooks/useCrowdDensity';
import type { DensityLevel } from '../types';

const DENSITY_COLORS: Record<DensityLevel, string> = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#ef4444',
};

const DENSITY_FILL_OPACITY: Record<DensityLevel, number> = {
  low: 0.28,
  medium: 0.42,
  high: 0.58,
};

const DENSITY_META: Record<DensityLevel, { label: string; emoji: string; glowColor: string }> = {
  low:    { label: 'Low',      emoji: '🟢', glowColor: 'rgba(34,197,94,0.4)' },
  medium: { label: 'Moderate', emoji: '🟡', glowColor: 'rgba(245,158,11,0.4)' },
  high:   { label: 'High',     emoji: '🔴', glowColor: 'rgba(239,68,68,0.4)' },
};

// SVG zone definitions for the stadium map
interface SVGZone {
  id: string;
  label: string;
  shape: 'rect' | 'ellipse' | 'path';
  props: Record<string, number | string>;
}

const STADIUM_ZONES: SVGZone[] = [
  // Outer ring — gates
  { id: 'gate-A', label: 'Gate A (North)', shape: 'rect', props: { x: 175, y: 20, width: 50, height: 35, rx: 8 } },
  { id: 'gate-B', label: 'Gate B (NE)',    shape: 'rect', props: { x: 310, y: 55, width: 50, height: 35, rx: 8 } },
  { id: 'gate-C', label: 'Gate C (East)',  shape: 'rect', props: { x: 380, y: 165, width: 50, height: 35, rx: 8 } },
  { id: 'gate-D', label: 'Gate D (SE)',    shape: 'rect', props: { x: 345, y: 290, width: 50, height: 35, rx: 8 } },
  { id: 'gate-E', label: 'Gate E (South)', shape: 'rect', props: { x: 175, y: 355, width: 50, height: 35, rx: 8 } },
  { id: 'gate-F', label: 'Gate F (SW)',    shape: 'rect', props: { x: 35,  y: 290, width: 50, height: 35, rx: 8 } },
  { id: 'gate-G', label: 'Gate G (West)',  shape: 'rect', props: { x: 5,   y: 165, width: 50, height: 35, rx: 8 } },
  { id: 'gate-H', label: 'Gate H (NW)',    shape: 'rect', props: { x: 60,  y: 55,  width: 50, height: 35, rx: 8 } },
  // Inner concourses
  { id: 'concourse-N', label: 'North Concourse', shape: 'rect', props: { x: 130, y: 75,  width: 140, height: 55, rx: 8 } },
  { id: 'concourse-E', label: 'East Concourse',  shape: 'rect', props: { x: 315, y: 155, width: 55,  height: 100, rx: 8 } },
  { id: 'concourse-S', label: 'South Concourse', shape: 'rect', props: { x: 130, y: 285, width: 140, height: 55, rx: 8 } },
  { id: 'concourse-W', label: 'West Concourse',  shape: 'rect', props: { x: 30,  y: 155, width: 55,  height: 100, rx: 8 } },
  // Transit hubs
  { id: 'transit-N', label: 'North Transit Hub',       shape: 'ellipse', props: { cx: 200, cy: 10,  rx: 25, ry: 10 } },
  { id: 'transit-S', label: 'South Transit Hub',       shape: 'ellipse', props: { cx: 200, cy: 400, rx: 25, ry: 10 } },
  { id: 'transit-E', label: 'East Rideshare',          shape: 'ellipse', props: { cx: 420, cy: 205, rx: 20, ry: 15 } },
  { id: 'transit-W', label: 'West Accessible Shuttle', shape: 'ellipse', props: { cx: 10,  cy: 205, rx: 10, ry: 15 } },
];

export function MapPage() {
  const { t } = useTranslation();
  const { crowdData, isLoading } = useCrowdDensity();
  const [focusedZone, setFocusedZone] = React.useState<string | null>(null);

  function getDensityForZone(zoneId: string): DensityLevel {
    return crowdData?.zones[zoneId]?.density ?? 'low';
  }

  const focusedZoneData = focusedZone ? crowdData?.zones[focusedZone] : null;

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <span
            className="text-lg"
            style={{
              background: 'linear-gradient(135deg, #ffc80a, #ffd84d)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            🗺️
          </span>
          {t('map.title')}
        </h1>
        {isLoading ? (
          <div className="flex items-center gap-2 text-xs text-stadium-light">
            <span className="live-dot" aria-hidden="true" />
            <span>Updating...</span>
          </div>
        ) : (
          crowdData && (
            <div className="flex items-center gap-2 text-xs text-green-400">
              <span className="live-dot" aria-hidden="true" />
              <span>Live</span>
            </div>
          )
        )}
      </div>

      {/* ── Legend ──────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 flex-wrap"
        role="list"
        aria-label="Crowd density legend"
      >
        {(['low', 'medium', 'high'] as DensityLevel[]).map((d) => (
          <div
            key={d}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border"
            style={{
              background: `${DENSITY_COLORS[d]}15`,
              borderColor: `${DENSITY_COLORS[d]}40`,
              color: DENSITY_COLORS[d],
            }}
            role="listitem"
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: DENSITY_COLORS[d], boxShadow: `0 0 6px ${DENSITY_COLORS[d]}` }}
              aria-hidden="true"
            />
            <span className="capitalize">{t(`density.${d}` as 'density.low')}</span>
          </div>
        ))}
      </div>

      {/* ── SVG Stadium Map ──────────────────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-1 overflow-hidden shadow-card">
        {/* Map header accent */}
        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <span className="text-[11px] text-stadium-light font-medium tracking-wider uppercase">MetLife Stadium</span>
          <span className="text-[11px] text-gold-500 font-semibold">FIFA World Cup 2026™</span>
        </div>
        <svg
          viewBox="0 0 430 410"
          className="w-full max-h-[380px]"
          role="img"
          aria-labelledby="stadium-map-title"
          aria-describedby="stadium-map-desc"
        >
          <defs>
            <radialGradient id="pitchGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#1a8040" />
              <stop offset="100%" stopColor="#0f5c2a" />
            </radialGradient>
            <filter id="zoneGlow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="focusGlow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <title id="stadium-map-title">MetLife Stadium Map</title>
          <desc id="stadium-map-desc">
            Interactive stadium map showing crowd density across zones. Green = low, amber = moderate, red = high.
          </desc>

          {/* Background */}
          <rect x="0" y="0" width="430" height="410" fill="#070f1d" rx="12" />

          {/* Subtle grid pattern */}
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(48,96,255,0.05)" strokeWidth="0.5" />
          </pattern>
          <rect x="0" y="0" width="430" height="410" fill="url(#grid)" rx="12" />

          {/* Pitch (center) */}
          <ellipse cx="200" cy="205" rx="92" ry="77" fill="url(#pitchGradient)" stroke="#15803d" strokeWidth="1.5" />
          {/* Center circle */}
          <ellipse cx="200" cy="205" rx="52" ry="32" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="4 3" />
          {/* Center spot */}
          <circle cx="200" cy="205" r="2.5" fill="rgba(255,255,255,0.3)" />
          {/* Halfway line */}
          <line x1="110" y1="205" x2="290" y2="205" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
          <text x="200" y="210" textAnchor="middle" fill="rgba(74,222,128,0.7)" fontSize="9" fontFamily="Inter" fontWeight="600">
            PITCH
          </text>

          {/* Zone shapes */}
          {STADIUM_ZONES.map((zone) => {
            const density = getDensityForZone(zone.id);
            const color = DENSITY_COLORS[density];
            const fillOpacity = DENSITY_FILL_OPACITY[density];
            const isFocused = focusedZone === zone.id;

            const commonProps = {
              fill: color,
              fillOpacity: isFocused ? Math.min(fillOpacity + 0.2, 0.85) : fillOpacity,
              stroke: isFocused ? '#ffc80a' : color,
              strokeWidth: isFocused ? 2 : 0.8,
              strokeOpacity: isFocused ? 1 : 0.6,
              filter: isFocused ? 'url(#focusGlow)' : undefined,
              tabIndex: 0,
              role: 'button' as const,
              'aria-label': `${zone.label}: ${density} crowd density`,
              onFocus: () => setFocusedZone(zone.id),
              onBlur: () => setFocusedZone(null),
              onMouseEnter: () => setFocusedZone(zone.id),
              onMouseLeave: () => setFocusedZone(null),
              style: { cursor: 'pointer', transition: 'all 0.25s ease' },
            };

            if (zone.shape === 'rect') {
              return (
                <rect key={zone.id} {...commonProps} {...(zone.props as any)}>
                  <title>{zone.label}: {density} crowd density</title>
                </rect>
              );
            } else if (zone.shape === 'ellipse') {
              return (
                <ellipse key={zone.id} {...commonProps} {...(zone.props as any)}>
                  <title>{zone.label}: {density} crowd density</title>
                </ellipse>
              );
            }
            return null;
          })}

          {/* Zone labels (abbreviated) */}
          {[
            { id: 'gate-A', x: 200, y: 43,  label: 'A' },
            { id: 'gate-B', x: 335, y: 77,  label: 'B' },
            { id: 'gate-C', x: 405, y: 186, label: 'C' },
            { id: 'gate-D', x: 370, y: 311, label: 'D' },
            { id: 'gate-E', x: 200, y: 377, label: 'E' },
            { id: 'gate-F', x: 60,  y: 311, label: 'F' },
            { id: 'gate-G', x: 30,  y: 186, label: 'G' },
            { id: 'gate-H', x: 85,  y: 77,  label: 'H' },
          ].map((lbl) => (
            <text
              key={lbl.id}
              x={lbl.x}
              y={lbl.y}
              textAnchor="middle"
              fill={focusedZone === lbl.id ? '#ffc80a' : 'rgba(255,255,255,0.9)'}
              fontSize="11"
              fontWeight="700"
              fontFamily="Inter"
              aria-hidden="true"
              style={{ transition: 'fill 0.2s' }}
            >
              {lbl.label}
            </text>
          ))}

          {/* Stadium label */}
          <text x="200" y="397" textAnchor="middle" fill="rgba(74,96,144,0.6)" fontSize="8" fontFamily="Inter" aria-hidden="true">
            MetLife Stadium — East Rutherford, NJ
          </text>
        </svg>
      </div>

      {/* ── Focused zone detail ──────────────────────────────────────────── */}
      {focusedZone && focusedZoneData && (
        <div
          className="glass-card rounded-xl p-4 animate-slide-in-right border"
          style={{
            borderColor: `${DENSITY_COLORS[focusedZoneData.density]}30`,
            background: `rgba(17, 31, 58, 0.9)`,
          }}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-white text-sm">{focusedZoneData.zoneLabel}</p>
              <p className="text-xs text-stadium-light mt-0.5">
                Updated: {new Date(focusedZoneData.updatedAt).toLocaleTimeString()}
              </p>
            </div>
            {/* Density badge */}
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border"
              style={{
                background: `${DENSITY_COLORS[focusedZoneData.density]}18`,
                borderColor: `${DENSITY_COLORS[focusedZoneData.density]}50`,
                color: DENSITY_COLORS[focusedZoneData.density],
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{
                  background: DENSITY_COLORS[focusedZoneData.density],
                  boxShadow: `0 0 6px ${DENSITY_COLORS[focusedZoneData.density]}`,
                }}
              />
              {DENSITY_META[focusedZoneData.density].label}
            </div>
          </div>

          {/* Occupancy bar */}
          <div className="mt-3">
            <div className="flex justify-between text-xs text-stadium-light mb-1">
              <span>Estimated Occupancy</span>
              <span className="font-medium text-white">~{focusedZoneData.estimatedOccupancy} ppl/100m²</span>
            </div>
            <div className="h-1.5 bg-stadium-dark rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min((focusedZoneData.estimatedOccupancy / 150) * 100, 100)}%`,
                  background: DENSITY_COLORS[focusedZoneData.density],
                  boxShadow: `0 0 8px ${DENSITY_COLORS[focusedZoneData.density]}`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Last updated ─────────────────────────────────────────────────── */}
      {crowdData && (
        <p className="text-xs text-stadium-light text-center opacity-60">
          Last refreshed: {new Date(crowdData.lastRefreshed).toLocaleTimeString()}
          <span className="block text-[10px] mt-0.5">Auto-updates every 30 seconds</span>
        </p>
      )}
    </div>
  );
}
