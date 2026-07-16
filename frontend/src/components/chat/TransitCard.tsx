/**
 * FanGuide AI — Transit Card Component
 *
 * Renders transit recommendations from getTransportOptions tool results.
 * Highlights the "leave by" time prominently and shows accessibility info.
 */


import { useTranslation } from 'react-i18next';
import type { TransitRecommendation } from '../../types';

interface TransitCardProps {
  recommendations: TransitRecommendation[];
}

const TYPE_LABELS: Record<string, string> = {
  rail: '🚇 Rail',
  shuttle: '🚌 Shuttle',
  bus: '🚍 Bus',
  rideshare: '🚖 Rideshare',
};

export function TransitCard({ recommendations }: TransitCardProps) {
  const { t } = useTranslation();

  if (recommendations.length === 0) {
    return (
      <div className="glass-card rounded-xl p-4 mt-2 animate-fade-in">
        <p className="text-amber-400 text-sm">
          No direct transit options found. Please visit the North or South Transit Hub.
        </p>
      </div>
    );
  }

  return (
    <section
      className="glass-card rounded-xl p-4 mt-2 animate-fade-in space-y-3"
      aria-label="Transit options"
    >
      <h3 className="font-semibold text-white flex items-center gap-2">
        <span aria-hidden="true">🚇</span>
        {t('transit.title')}
      </h3>

      {recommendations.map((rec, idx) => (
        <article
          key={rec.option.id}
          className="border border-stadium-border rounded-lg p-3 bg-stadium-dark/50"
          aria-label={`Option ${idx + 1}: ${rec.option.name}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-stadium-light">
                {TYPE_LABELS[rec.option.type] ?? rec.option.type}
              </p>
              <p className="text-sm font-medium text-white mt-0.5 truncate">
                {rec.option.name}
              </p>
              <p className="text-xs text-stadium-light mt-0.5">
                To: {rec.recommendedDestination.name}
              </p>
            </div>

            {/* Leave-by time — most prominent element */}
            <div
              className="flex-shrink-0 text-right"
              aria-label={`Leave by ${rec.leaveByTime}`}
            >
              <p className="text-xs text-stadium-light">{t('transit.leaveBy')}</p>
              <p className="text-xl font-bold text-gold-400">{rec.leaveByTime}</p>
            </div>
          </div>

          {/* Journey details */}
          <div className="mt-2 flex items-center gap-3 text-xs text-stadium-light">
            <span>🚶 {rec.recommendedDestination.walkToHubMinutes}m to hub</span>
            <span>·</span>
            <span>🕐 {rec.recommendedDestination.travelMinutes}m journey</span>
            <span>·</span>
            <span>⏱ +{rec.bufferMinutes}m buffer</span>
          </div>

          {/* Frequency */}
          <p className="mt-1.5 text-xs text-stadium-light">
            🔄 {rec.option.frequency}
          </p>

          {/* Accessibility note */}
          {rec.option.accessible && (
            <p className="mt-1.5 text-xs text-blue-300 flex items-center gap-1">
              <span aria-hidden="true">♿</span>
              {t('transit.accessible')}
            </p>
          )}
        </article>
      ))}
    </section>
  );
}
