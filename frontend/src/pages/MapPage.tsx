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
import { clsx } from 'clsx';

const DENSITY_COLORS: Record<DensityLevel, string> = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#ef4444',
};

const DENSITY_FILL_OPACITY: Record<DensityLevel, number> = {
  low: 0.3,
  medium: 0.45,
  high: 0.6,
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
  { id: 'gate-B', label: 'Gate B (NE)', shape: 'rect', props: { x: 310, y: 55, width: 50, height: 35, rx: 8 } },
  { id: 'gate-C', label: 'Gate C (East)', shape: 'rect', props: { x: 380, y: 165, width: 50, height: 35, rx: 8 } },
  { id: 'gate-D', label: 'Gate D (SE)', shape: 'rect', props: { x: 345, y: 290, width: 50, height: 35, rx: 8 } },
  { id: 'gate-E', label: 'Gate E (South)', shape: 'rect', props: { x: 175, y: 355, width: 50, height: 35, rx: 8 } },
  { id: 'gate-F', label: 'Gate F (SW)', shape: 'rect', props: { x: 35, y: 290, width: 50, height: 35, rx: 8 } },
  { id: 'gate-G', label: 'Gate G (West)', shape: 'rect', props: { x: 5, y: 165, width: 50, height: 35, rx: 8 } },
  { id: 'gate-H', label: 'Gate H (NW)', shape: 'rect', props: { x: 60, y: 55, width: 50, height: 35, rx: 8 } },
  // Inner concourses
  { id: 'concourse-N', label: 'North Concourse', shape: 'rect', props: { x: 130, y: 75, width: 140, height: 55, rx: 8 } },
  { id: 'concourse-E', label: 'East Concourse', shape: 'rect', props: { x: 315, y: 155, width: 55, height: 100, rx: 8 } },
  { id: 'concourse-S', label: 'South Concourse', shape: 'rect', props: { x: 130, y: 285, width: 140, height: 55, rx: 8 } },
  { id: 'concourse-W', label: 'West Concourse', shape: 'rect', props: { x: 30, y: 155, width: 55, height: 100, rx: 8 } },
  // Transit hubs
  { id: 'transit-N', label: 'North Transit Hub', shape: 'ellipse', props: { cx: 200, cy: 10, rx: 25, ry: 10 } },
  { id: 'transit-S', label: 'South Transit Hub', shape: 'ellipse', props: { cx: 200, cy: 400, rx: 25, ry: 10 } },
  { id: 'transit-E', label: 'East Rideshare', shape: 'ellipse', props: { cx: 420, cy: 205, rx: 20, ry: 15 } },
  { id: 'transit-W', label: 'West Accessible Shuttle', shape: 'ellipse', props: { cx: 10, cy: 205, rx: 10, ry: 15 } },
];

export function MapPage() {
  const { t } = useTranslation();
  const { crowdData, isLoading } = useCrowdDensity();
  const [focusedZone, setFocusedZone] = React.useState<string | null>(null);

  function getDensityForZone(zoneId: string): DensityLevel {
    return crowdData?.zones[zoneId]?.density ?? 'low';
  }

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">{t('map.title')}</h1>
        {isLoading && (
          <span className="text-xs text-stadium-light animate-pulse-slow">
            Updating...
          </span>
        )}
      </div>

      {/* Legend */}
      <div
        className="flex items-center gap-4 text-xs"
        role="list"
        aria-label="Crowd density legend"
      >
        {(['low', 'medium', 'high'] as DensityLevel[]).map((d) => (
          <div key={d} className="flex items-center gap-1.5" role="listitem">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: DENSITY_COLORS[d] }}
              aria-hidden="true"
            />
            <span className="text-stadium-light capitalize">
              {t(`density.${d}` as 'density.low')}
            </span>
          </div>
        ))}
      </div>

      {/* SVG Stadium Map */}
      <div className="glass-card rounded-2xl p-4 overflow-hidden">
        <svg
          viewBox="0 0 430 410"
          className="w-full max-h-96"
          role="img"
          aria-labelledby="stadium-map-title"
          aria-describedby="stadium-map-desc"
        >
          <title id="stadium-map-title">MetLife Stadium Map</title>
          <desc id="stadium-map-desc">
            Interactive stadium map showing crowd density across zones. Green = low, amber = moderate, red = high.
          </desc>

          {/* Background */}
          <rect x="0" y="0" width="430" height="410" fill="#0A1628" rx="12" />

          {/* Pitch (center) */}
          <ellipse cx="200" cy="205" rx="90" ry="75" fill="#166534" stroke="#15803d" strokeWidth="2" />
          <ellipse cx="200" cy="205" rx="50" ry="30" fill="none" stroke="#15803d" strokeWidth="1" strokeDasharray="4 4" />
          <text x="200" y="209" textAnchor="middle" fill="#4ade80" fontSize="10" fontFamily="Inter">Pitch</text>

          {/* Zone shapes */}
          {STADIUM_ZONES.map((zone) => {
            const density = getDensityForZone(zone.id);
            const color = DENSITY_COLORS[density];
            const fillOpacity = DENSITY_FILL_OPACITY[density];
            const isFocused = focusedZone === zone.id;

            const commonProps = {
              fill: color,
              fillOpacity,
              stroke: isFocused ? '#ffc80a' : color,
              strokeWidth: isFocused ? 2.5 : 1,
              strokeOpacity: isFocused ? 1 : 0.7,
              tabIndex: 0,
              role: 'button' as const,
              'aria-label': `${zone.label}: ${density} crowd density`,
              onFocus: () => setFocusedZone(zone.id),
              onBlur: () => setFocusedZone(null),
              style: { cursor: 'pointer', transition: 'all 0.3s' },
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
            { id: 'gate-A', x: 200, y: 43, label: 'A' },
            { id: 'gate-B', x: 335, y: 77, label: 'B' },
            { id: 'gate-C', x: 405, y: 186, label: 'C' },
            { id: 'gate-D', x: 370, y: 311, label: 'D' },
            { id: 'gate-E', x: 200, y: 377, label: 'E' },
            { id: 'gate-F', x: 60, y: 311, label: 'F' },
            { id: 'gate-G', x: 30, y: 186, label: 'G' },
            { id: 'gate-H', x: 85, y: 77, label: 'H' },
          ].map((lbl) => (
            <text
              key={lbl.id}
              x={lbl.x}
              y={lbl.y}
              textAnchor="middle"
              fill="white"
              fontSize="11"
              fontWeight="bold"
              fontFamily="Inter"
              aria-hidden="true"
            >
              {lbl.label}
            </text>
          ))}

          {/* Stadium label */}
          <text x="200" y="395" textAnchor="middle" fill="#4a6090" fontSize="9" fontFamily="Inter" aria-hidden="true">
            MetLife Stadium — FIFA World Cup 2026
          </text>
        </svg>
      </div>

      {/* Focused zone detail */}
      {focusedZone && crowdData?.zones[focusedZone] && (
        <div
          className="glass-card rounded-xl p-4 animate-fade-in"
          role="status"
          aria-live="polite"
        >
          <p className="font-medium text-white">
            {crowdData.zones[focusedZone].zoneLabel}
          </p>
          <p className="text-sm text-stadium-light mt-1">
            Crowd density: <span className={clsx('font-bold', {
              'text-green-400': crowdData.zones[focusedZone].density === 'low',
              'text-amber-400': crowdData.zones[focusedZone].density === 'medium',
              'text-red-400': crowdData.zones[focusedZone].density === 'high',
            })}>
              {crowdData.zones[focusedZone].density}
            </span>
            {' '}— ~{crowdData.zones[focusedZone].estimatedOccupancy} people/100m²
          </p>
          <p className="text-xs text-stadium-light mt-1">
            Updated: {new Date(crowdData.zones[focusedZone].updatedAt).toLocaleTimeString()}
          </p>
        </div>
      )}

      {/* Last updated */}
      {crowdData && (
        <p className="text-xs text-stadium-light text-center">
          Last refreshed: {new Date(crowdData.lastRefreshed).toLocaleTimeString()}
          <span className="text-[10px] block text-stadium-muted">Auto-updates every 30 seconds</span>
        </p>
      )}
    </div>
  );
}
