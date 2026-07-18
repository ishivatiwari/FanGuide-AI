/**
 * FanGuide AI — Frontend Types
 *
 * TypeScript types shared across the React app.
 * Mirrors the backend domain types for consistency.
 */

// ── Chat ──────────────────────────────────────────────────────────────────────

export type SupportedLanguage = 'en' | 'es' | 'fr' | 'pt' | 'ar';

export type AccessibilityNeed =
  | 'wheelchair'
  | 'mobility-aid'
  | 'visual-impairment'
  | 'hearing-impairment'
  | 'sensory-sensitivity'
  | 'other';

export interface ChatContext {
  seat?: string;
  gate?: GateId;
  language: SupportedLanguage;
  accessibilityNeeds?: AccessibilityNeed[];
  currentTime?: string;
  stadiumId: string;
  sessionId: string;
}

export type GateId = 'gate-A' | 'gate-B' | 'gate-C' | 'gate-D' | 'gate-E' | 'gate-F' | 'gate-G' | 'gate-H';

// ── SSE Events ────────────────────────────────────────────────────────────────

export type SSEEvent =
  | { type: 'text'; data: { text: string } }
  | { type: 'tool_call'; data: { name: string; input: Record<string, unknown> } }
  | { type: 'tool_result'; data: { tool_use_id: string; content: string; is_error: boolean } }
  | { type: 'thinking'; data: { round: number } }
  | { type: 'done'; data: { category: string; isUrgent: boolean } }
  | { type: 'error'; data: { message: string; code: 'rate_limit' | 'api_error' | 'network' } };

// ── Chat Messages ─────────────────────────────────────────────────────────────

export type MessageRole = 'user' | 'assistant';

export interface ToolCallAttachment {
  name: string;
  input: Record<string, unknown>;
  result?: unknown;
  isError?: boolean;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  /** Parsed tool results attached to this message for rich card rendering */
  toolAttachments?: ToolCallAttachment[];
  isStreaming?: boolean;
  isUrgent?: boolean;
  /** Set to true when the message represents an API/network error */
  isError?: boolean;
  /** Error classification: 'rate_limit' | 'api_error' | 'network' */
  errorCode?: string;
}

// ── Route Result (from getRoute tool) ────────────────────────────────────────

export interface RouteStep {
  from: string;
  to: string;
  fromLabel: string;
  toLabel: string;
  durationSeconds: number;
  via: string;
  accessible: boolean;
}

export interface RouteResult {
  from: string;
  to: string;
  totalDurationSeconds: number;
  steps: RouteStep[];
  accessibilityMode: boolean;
  nodePath: string[];
}

// ── Crowd Density ─────────────────────────────────────────────────────────────

export type DensityLevel = 'low' | 'medium' | 'high';

export interface ZoneDensity {
  zoneId: string;
  zoneLabel: string;
  density: DensityLevel;
  estimatedOccupancy: number;
  updatedAt: string;
}

export interface CrowdDensityState {
  zones: Record<string, ZoneDensity>;
  lastRefreshed: string;
}

// ── Wait Time ─────────────────────────────────────────────────────────────────

export interface WaitTimeResult {
  amenityId: string;
  amenityName: string;
  estimatedWaitMinutes: number;
  queueLength: 'none' | 'short' | 'moderate' | 'long';
  updatedAt: string;
}

// ── Transit ───────────────────────────────────────────────────────────────────

export interface TransitDestination {
  name: string;
  travelMinutes: number;
  walkToHubMinutes: number;
}

export interface TransitOption {
  id: string;
  name: string;
  type: 'rail' | 'shuttle' | 'bus' | 'rideshare';
  description: string;
  hub: string;
  destinations: TransitDestination[];
  frequency: string;
  accessible: boolean;
  accessibilityNotes: string;
}

export interface TransitRecommendation {
  option: TransitOption;
  recommendedDestination: TransitDestination;
  leaveByTime: string;
  totalJourneyMinutes: number;
  bufferMinutes: number;
}

// ── Accessibility Info ────────────────────────────────────────────────────────

export interface AccessibilityInfo {
  gateId: string;
  gateLabel: string;
  nearestAccessibleRestroom: { id: string; label: string; walkMinutes: number } | null;
  nearestLift: { id: string; label: string; walkMinutes: number } | null;
  quietRoom: { id: string; label: string; walkMinutes: number } | null;
  aslHelpPoint: { id: string; label: string; walkMinutes: number } | null;
  wheelchairRoute: string;
  sensoryFriendlyZones: string[];
  notes: string;
}

// ── Accessibility Settings ────────────────────────────────────────────────────

export interface AccessibilitySettings {
  fontSize: 'sm' | 'md' | 'lg' | 'xl';
  highContrast: boolean;
  reducedMotion: boolean;
  screenReaderMode: boolean;
  textToSpeech: boolean;
  accessibilityNeeds: AccessibilityNeed[];
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export type QueryCategory =
  | 'navigation' | 'food' | 'restroom' | 'transit'
  | 'accessibility' | 'emergency' | 'merchandise' | 'other';

export interface AnonymizedQueryRecord {
  category: QueryCategory;
  timestamp: string;
  isUrgent: boolean;
  sessionHash: string;
}

export interface DashboardData {
  queryCounts: Record<QueryCategory, number>;
  urgentAlerts: AnonymizedQueryRecord[];
  crowdDensity: CrowdDensityState;
  totalQueriesLast5Min: number;
}
