/**
 * FanGuide AI — Route Card Component
 *
 * Renders the result of a getRoute tool call as a rich visual card
 * with step-by-step directions, walking time, and accessibility badge.
 *
 * Accessibility:
 *   - All steps are in an ordered list (semantically meaningful)
 *   - Icons have aria-hidden="true" with text labels
 *   - Accessible route badge has explicit label
 */


import { useTranslation } from 'react-i18next';
import type { RouteResult } from '../../types';
import { clsx } from 'clsx';

interface RouteCardProps {
  route: RouteResult;
}

const VIA_ICONS: Record<string, string> = {
  walkway: '🚶',
  ramp: '↗️',
  lift: '🛗',
  stairs: '🪜',
  'accessible-shuttle': '♿',
};

export function RouteCard({ route }: RouteCardProps) {
  const { t } = useTranslation();
  const totalMin = Math.round(route.totalDurationSeconds / 60);

  if (route.steps.length === 0) {
    return (
      <div className="glass-card rounded-xl p-4 mt-2 animate-fade-in">
        <p className="text-green-400 font-medium">✅ You're already there!</p>
      </div>
    );
  }

  return (
    <article
      className="glass-card rounded-xl p-4 mt-2 animate-fade-in"
      aria-label={`Route: ${route.steps[0]?.fromLabel} to ${route.steps[route.steps.length - 1]?.toLabel}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <span aria-hidden="true">🗺️</span>
          {t('route.title')}
        </h3>
        <div className="flex items-center gap-2">
          {route.accessibilityMode && (
            <span
              className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30"
              aria-label="Accessible route"
            >
              ♿ {t('route.accessible')}
            </span>
          )}
          <span className="text-sm font-bold text-gold-400">
            {totalMin} {t('route.minutes')}
          </span>
        </div>
      </div>

      {/* Steps */}
      <ol className="space-y-0" aria-label="Route steps">
        {route.steps.map((step, idx) => (
          <li
            key={`${step.from}-${step.to}`}
            className={clsx(
              'relative route-step flex items-start gap-3 pb-4',
              idx === route.steps.length - 1 && 'pb-0'
            )}
          >
            {/* Step number / connector dot */}
            <div
              className="relative z-10 flex-shrink-0 w-7 h-7 rounded-full bg-brand-500/30 border border-brand-500/50 flex items-center justify-center text-xs font-bold text-brand-300"
              aria-hidden="true"
            >
              {idx + 1}
            </div>

            <div className="flex-1 min-w-0 pt-0.5">
              {/* From label */}
              <p className="text-sm text-white font-medium truncate">
                {step.fromLabel}
              </p>
              {/* Direction */}
              <p className="text-xs text-stadium-light mt-0.5 flex items-center gap-1">
                <span aria-hidden="true">{VIA_ICONS[step.via] ?? '→'}</span>
                <span>
                  {t('route.via')} {step.via} · {Math.round(step.durationSeconds / 60)}
                  {t('route.minutes')}
                </span>
              </p>
            </div>
          </li>
        ))}

        {/* Destination */}
        <li className="flex items-start gap-3">
          <div
            className="flex-shrink-0 w-7 h-7 rounded-full bg-green-500/30 border border-green-500/50 flex items-center justify-center text-green-300"
            aria-hidden="true"
          >
            ✓
          </div>
          <div className="flex-1 pt-0.5">
            <p className="text-sm text-green-300 font-medium">
              {route.steps[route.steps.length - 1]?.toLabel}
            </p>
            <p className="text-xs text-stadium-light">Destination</p>
          </div>
        </li>
      </ol>
    </article>
  );
}
