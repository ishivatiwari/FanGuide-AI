/**
 * FanGuide AI — Wait Time Badge Component
 *
 * Renders the result of a getWaitTime tool call as a compact,
 * color-coded badge showing estimated queue length and wait minutes.
 */


import { useTranslation } from 'react-i18next';
import type { WaitTimeResult } from '../../types';
import { clsx } from 'clsx';

interface WaitTimeBadgeProps {
  waitTime: WaitTimeResult;
}

const QUEUE_COLORS: Record<WaitTimeResult['queueLength'], string> = {
  none: 'bg-green-500/20 text-green-300 border-green-500/30',
  short: 'bg-green-500/20 text-green-300 border-green-500/30',
  moderate: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  long: 'bg-red-500/20 text-red-300 border-red-500/30',
};

const QUEUE_ICONS: Record<WaitTimeResult['queueLength'], string> = {
  none: '✅',
  short: '🟢',
  moderate: '🟡',
  long: '🔴',
};

export function WaitTimeBadge({ waitTime }: WaitTimeBadgeProps) {
  const { t } = useTranslation();

  return (
    <div
      className="glass-card rounded-xl p-3 mt-2 animate-fade-in"
      role="status"
      aria-label={`Wait time at ${waitTime.amenityName}: ${waitTime.estimatedWaitMinutes} minutes`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-stadium-light uppercase tracking-wide">
            {t('waittime.title')}
          </p>
          <p className="text-sm font-medium text-white mt-0.5 truncate">
            {waitTime.amenityName}
          </p>
        </div>

        <div
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-semibold',
            QUEUE_COLORS[waitTime.queueLength]
          )}
        >
          <span aria-hidden="true">{QUEUE_ICONS[waitTime.queueLength]}</span>
          {waitTime.estimatedWaitMinutes === 0
            ? t('waittime.none')
            : `${waitTime.estimatedWaitMinutes} ${t('waittime.minutes')}`}
        </div>
      </div>

      <p className="text-xs text-stadium-light mt-1.5">
        {t(`waittime.${waitTime.queueLength}` as 'waittime.none')}
      </p>
    </div>
  );
}
