/**
 * FanGuide AI — Anonymized Query Analytics Store
 *
 * Stores anonymized, aggregated query data for the volunteer/staff dashboard.
 *
 * PRIVACY DESIGN:
 *   - No PII is stored (no names, seats, GPS, or personal identifiers)
 *   - Session IDs are one-way hashed before storage (SHA-256 truncated)
 *   - Only the query CATEGORY is stored, not the query text
 *   - Data is in-memory only — not persisted to disk
 *   - Urgency flag (true/false) identifies accessibility emergencies
 *
 * In production, this would write to an append-only analytics table
 * with the same anonymization guarantees.
 */

import { createHash } from 'crypto';
import type { AnonymizedQueryRecord, DashboardData, QueryCategory } from '../types/stadium';
import { getAllCrowdDensity } from './crowdDensity';

// ── Module-level store (in-memory, non-persistent) ────────────────────────────

/** Ring buffer — keeps last 500 records to bound memory usage */
const MAX_RECORDS = 500;
const _records: AnonymizedQueryRecord[] = [];

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Records an anonymized query event.
 *
 * @param sessionId  Raw session ID — will be hashed before storage
 * @param category   The detected query category
 * @param isUrgent   True for accessibility emergencies, injuries, etc.
 */
export function recordQuery(
  sessionId: string,
  category: QueryCategory,
  isUrgent: boolean
): void {
  // One-way hash of session ID — cannot be reversed to identify the user
  const sessionHash = createHash('sha256')
    .update(sessionId)
    .digest('hex')
    .substring(0, 16); // Truncate to 16 chars — still collision-resistant for our scale

  const record: AnonymizedQueryRecord = {
    category,
    timestamp: new Date().toISOString(),
    isUrgent,
    sessionHash,
  };

  // Maintain ring buffer
  if (_records.length >= MAX_RECORDS) {
    _records.shift(); // Remove oldest
  }
  _records.push(record);
}

/**
 * Returns aggregated dashboard data for the volunteer/staff view.
 * Only anonymized aggregate counts and flagged alerts are returned.
 */
export function getDashboardData(): DashboardData {
  const now = Date.now();
  const fiveMinutesAgo = now - 5 * 60 * 1000;

  // Count queries per category
  const queryCounts: Record<QueryCategory, number> = {
    navigation: 0,
    food: 0,
    restroom: 0,
    transit: 0,
    accessibility: 0,
    emergency: 0,
    merchandise: 0,
    other: 0,
  };

  let totalQueriesLast5Min = 0;
  const urgentAlerts: AnonymizedQueryRecord[] = [];

  for (const record of _records) {
    queryCounts[record.category] = (queryCounts[record.category] ?? 0) + 1;

    if (new Date(record.timestamp).getTime() > fiveMinutesAgo) {
      totalQueriesLast5Min++;
    }

    // Surface urgent queries from the last 30 minutes for staff attention
    if (record.isUrgent && new Date(record.timestamp).getTime() > now - 30 * 60 * 1000) {
      urgentAlerts.push(record);
    }
  }

  return {
    queryCounts,
    urgentAlerts: urgentAlerts.reverse(), // Most recent first
    crowdDensity: getAllCrowdDensity(),
    totalQueriesLast5Min,
  };
}

/**
 * Classifies a user message into a query category.
 * Simple keyword heuristic — a production system would use a classifier.
 *
 * @param message  The user's raw message text
 * @returns        The detected category
 */
export function classifyQueryCategory(message: string): QueryCategory {
  const lower = message.toLowerCase();

  if (/\b(emergen|injur|hurt|ambulance|attack|fire|danger|help me)\b/.test(lower)) {
    return 'emergency';
  }
  if (/\b(access|wheelchair|mobility|ramp|lift|elevator|hearing|blind|sensory|asl|sign language)\b/.test(lower)) {
    return 'accessibility';
  }
  if (/\b(restroom|bathroom|toilet|loo|wc)\b/.test(lower)) {
    return 'restroom';
  }
  if (/\b(food|eat|drink|vegan|halal|kosher|gluten|allergen|hungry|snack|beer|water)\b/.test(lower)) {
    return 'food';
  }
  if (/\b(transit|bus|train|shuttle|subway|metro|taxi|uber|lyft|parking|exit|home|leave)\b/.test(lower)) {
    return 'transit';
  }
  if (/\b(merch|merchandise|shop|store|souvenir|scarf|jersey|hat|gift)\b/.test(lower)) {
    return 'merchandise';
  }
  if (/\b(seat|section|gate|route|navigate|where|direction|find|map|concourse)\b/.test(lower)) {
    return 'navigation';
  }

  return 'other';
}
