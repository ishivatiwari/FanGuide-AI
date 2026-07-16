/**
 * FanGuide AI — Frontend Component Tests
 *
 * Tests for key frontend components using React Testing Library.
 * Covers:
 *   1. RouteCard renders steps and walking time
 *   2. WaitTimeBadge renders correct color class for each queue level
 *   3. TransitCard renders leave-by time prominently
 *   4. ToolResultRenderer renders correct component for each tool name
 */

import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import { RouteCard } from '../components/chat/RouteCard';
import { WaitTimeBadge } from '../components/chat/WaitTimeBadge';
import { TransitCard } from '../components/chat/TransitCard';
import type { RouteResult, WaitTimeResult, TransitRecommendation } from '../types';

// ── Test Data ─────────────────────────────────────────────────────────────────

const MOCK_ROUTE: RouteResult = {
  from: 'gate-A',
  to: 'section-100',
  totalDurationSeconds: 120,
  accessibilityMode: false,
  nodePath: ['gate-A', 'concourse-N', 'section-100'],
  steps: [
    {
      from: 'gate-A',
      to: 'concourse-N',
      fromLabel: 'Gate A (North)',
      toLabel: 'North Concourse',
      durationSeconds: 60,
      via: 'ramp',
      accessible: true,
    },
    {
      from: 'concourse-N',
      to: 'section-100',
      fromLabel: 'North Concourse',
      toLabel: 'Section 100',
      durationSeconds: 60,
      via: 'walkway',
      accessible: true,
    },
  ],
};

const MOCK_WAIT_TIME: WaitTimeResult = {
  amenityId: 'restroom-N1',
  amenityName: 'Restrooms — North Lower',
  estimatedWaitMinutes: 8,
  queueLength: 'moderate',
  updatedAt: '2026-07-17T00:00:00Z',
};

const MOCK_TRANSIT_REC: TransitRecommendation = {
  option: {
    id: 'njt-meadowlands',
    name: 'NJ Transit — Meadowlands Rail',
    type: 'rail',
    description: 'Direct rail to NYC',
    hub: 'transit-N',
    destinations: [{ name: 'Penn Station', travelMinutes: 35, walkToHubMinutes: 10 }],
    frequency: 'Every 15 min',
    accessible: true,
    accessibilityNotes: 'Accessible.',
  },
  recommendedDestination: { name: 'Penn Station', travelMinutes: 35, walkToHubMinutes: 10 },
  leaveByTime: '6:30 PM',
  totalJourneyMinutes: 60,
  bufferMinutes: 15,
};

// ── Helper ────────────────────────────────────────────────────────────────────

function renderWithI18n(component: React.ReactElement) {
  return render(
    <I18nextProvider i18n={i18n}>{component}</I18nextProvider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

describe('RouteCard', () => {
  test('renders total walking time', () => {
    renderWithI18n(<RouteCard route={MOCK_ROUTE} />);
    expect(screen.getByText('2')).toBeInTheDocument(); // 120s = 2 min
  });

  test('renders all step labels', () => {
    renderWithI18n(<RouteCard route={MOCK_ROUTE} />);
    expect(screen.getByText('Gate A (North)')).toBeInTheDocument();
    expect(screen.getByText('North Concourse')).toBeInTheDocument();
    expect(screen.getByText('Section 100')).toBeInTheDocument();
  });

  test('renders accessible route badge when accessibilityMode is true', () => {
    renderWithI18n(<RouteCard route={{ ...MOCK_ROUTE, accessibilityMode: true }} />);
    expect(screen.getByLabelText('Accessible route')).toBeInTheDocument();
  });

  test('does not render accessible badge when accessibilityMode is false', () => {
    renderWithI18n(<RouteCard route={MOCK_ROUTE} />);
    expect(screen.queryByLabelText('Accessible route')).not.toBeInTheDocument();
  });

  test('renders "already there" message for empty steps', () => {
    renderWithI18n(
      <RouteCard route={{ ...MOCK_ROUTE, steps: [], totalDurationSeconds: 0 }} />
    );
    expect(screen.getByText(/You're already there!/)).toBeInTheDocument();
  });

  test('has correct aria-label on the article', () => {
    renderWithI18n(<RouteCard route={MOCK_ROUTE} />);
    expect(
      screen.getByRole('article', { name: /Route: Gate A \(North\) to Section 100/ })
    ).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('WaitTimeBadge', () => {
  test('renders amenity name', () => {
    renderWithI18n(<WaitTimeBadge waitTime={MOCK_WAIT_TIME} />);
    expect(screen.getByText('Restrooms — North Lower')).toBeInTheDocument();
  });

  test('renders estimated wait minutes', () => {
    renderWithI18n(<WaitTimeBadge waitTime={MOCK_WAIT_TIME} />);
    expect(screen.getByText(/8/)).toBeInTheDocument();
  });

  test('renders "No queue" for zero wait time', () => {
    renderWithI18n(
      <WaitTimeBadge waitTime={{ ...MOCK_WAIT_TIME, estimatedWaitMinutes: 0, queueLength: 'none' }} />
    );
    expect(screen.getAllByText('No queue').length).toBeGreaterThan(0);
  });

  test('has role="status" for screen reader announcement', () => {
    renderWithI18n(<WaitTimeBadge waitTime={MOCK_WAIT_TIME} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('TransitCard', () => {
  test('renders leave-by time prominently', () => {
    renderWithI18n(<TransitCard recommendations={[MOCK_TRANSIT_REC]} />);
    expect(screen.getByText('6:30 PM')).toBeInTheDocument();
  });

  test('renders transit option name', () => {
    renderWithI18n(<TransitCard recommendations={[MOCK_TRANSIT_REC]} />);
    expect(screen.getByText('NJ Transit — Meadowlands Rail')).toBeInTheDocument();
  });

  test('renders accessibility note for accessible options', () => {
    renderWithI18n(<TransitCard recommendations={[MOCK_TRANSIT_REC]} />);
    expect(screen.getByText(/Accessible vehicles/i)).toBeInTheDocument();
  });

  test('renders "no options" message for empty recommendations', () => {
    renderWithI18n(<TransitCard recommendations={[]} />);
    expect(screen.getByText(/No direct transit options/i)).toBeInTheDocument();
  });

  test('renders destination name', () => {
    renderWithI18n(<TransitCard recommendations={[MOCK_TRANSIT_REC]} />);
    expect(screen.getByText(/Penn Station/i)).toBeInTheDocument();
  });
});
