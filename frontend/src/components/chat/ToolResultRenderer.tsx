/**
 * FanGuide AI — Tool Result Renderer
 *
 * Parses tool call results and renders the appropriate rich card component.
 * This is the bridge between raw JSON tool results and visual UI components.
 *
 * Tool → Component mapping:
 *   getRoute          → RouteCard
 *   getWaitTime       → WaitTimeBadge
 *   getTransportOptions → TransitCard
 *   getCrowdDensity   → inline density indicator
 *   getAccessibilityInfo → accessibility info card
 */


import type { ToolCallAttachment, RouteResult, WaitTimeResult, TransitRecommendation, AccessibilityInfo } from '../../types';
import { RouteCard } from './RouteCard';
import { WaitTimeBadge } from './WaitTimeBadge';
import { TransitCard } from './TransitCard';

interface ToolResultRendererProps {
  attachment: ToolCallAttachment;
}

export function ToolResultRenderer({ attachment }: ToolResultRendererProps) {
  const { name, result, isError } = attachment;

  if (isError || !result) {
    return (
      <div className="mt-2 text-xs text-amber-400 flex items-center gap-1 animate-fade-in">
        <span aria-hidden="true">⚠️</span>
        <span>Tool error — see assistant message for details</span>
      </div>
    );
  }

  // Loading state — result not yet received
  if (result === undefined) {
    return (
      <div className="mt-2 h-12 rounded-lg shimmer" aria-label="Loading tool result..." role="status" />
    );
  }

  try {
    switch (name) {
      case 'getRoute': {
        const route = result as RouteResult;
        if ('error' in (result as Record<string, unknown>)) return null;
        return <RouteCard route={route} />;
      }

      case 'getWaitTime': {
        const waitTime = result as WaitTimeResult;
        if ('error' in (result as Record<string, unknown>)) return null;
        return <WaitTimeBadge waitTime={waitTime} />;
      }

      case 'getTransportOptions': {
        const data = result as { options?: TransitRecommendation[] };
        const options = data.options ?? [];
        return <TransitCard recommendations={options} />;
      }

      case 'getCrowdDensity': {
        const data = result as { zoneLabel: string; density: string; estimatedOccupancy: number };
        if ('error' in (result as Record<string, unknown>)) return null;

        const densityColors: Record<string, string> = {
          low: 'density-low',
          medium: 'density-medium',
          high: 'density-high',
        };

        return (
          <div
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium mt-2 ${densityColors[data.density] ?? 'density-medium'} animate-fade-in`}
            role="status"
            aria-label={`${data.zoneLabel}: ${data.density} crowd density`}
          >
            <span aria-hidden="true">👥</span>
            {data.zoneLabel}: <strong>{data.density}</strong> ({data.estimatedOccupancy}/100m²)
          </div>
        );
      }

      case 'getAccessibilityInfo': {
        const info = result as AccessibilityInfo;
        if ('error' in (result as Record<string, unknown>)) return null;

        return (
          <article
            className="glass-card rounded-xl p-4 mt-2 animate-fade-in space-y-2"
            aria-label={`Accessibility information for ${info.gateLabel}`}
          >
            <h3 className="font-semibold text-white flex items-center gap-2 text-sm">
              <span aria-hidden="true">♿</span> Accessibility — {info.gateLabel}
            </h3>

            {info.nearestLift && (
              <p className="text-xs text-stadium-light">
                🛗 Nearest Lift: <span className="text-white">{info.nearestLift.label}</span>
                {' '}({info.nearestLift.walkMinutes}m walk)
              </p>
            )}
            {info.nearestAccessibleRestroom && (
              <p className="text-xs text-stadium-light">
                🚻 Accessible Restroom: <span className="text-white">{info.nearestAccessibleRestroom.label}</span>
                {' '}({info.nearestAccessibleRestroom.walkMinutes}m walk)
              </p>
            )}
            {info.quietRoom && (
              <p className="text-xs text-stadium-light">
                🔇 Quiet Room: <span className="text-white">{info.quietRoom.label}</span>
                {' '}({info.quietRoom.walkMinutes}m walk)
              </p>
            )}
            {info.aslHelpPoint && (
              <p className="text-xs text-stadium-light">
                👋 ASL Help: <span className="text-white">{info.aslHelpPoint.label}</span>
                {' '}({info.aslHelpPoint.walkMinutes}m walk)
              </p>
            )}
            <p className="text-xs text-blue-300 border-t border-stadium-border pt-2 mt-2">
              {info.wheelchairRoute}
            </p>
          </article>
        );
      }

      default:
        return null;
    }
  } catch {
    return null;
  }
}
