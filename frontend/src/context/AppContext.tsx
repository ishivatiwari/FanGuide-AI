/**
 * FanGuide AI — Accessibility & Settings Context
 *
 * Provides global state for:
 *   - Fan session context (seat, gate, language)
 *   - Accessibility settings (font size, high contrast, TTS, etc.)
 *
 * Settings are persisted to localStorage so they survive page refreshes.
 * Font size changes update the CSS custom property on <html>.
 * High contrast and reduced motion update CSS classes on <html>.
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type ReactNode,
} from 'react';
import { v4 as uuidv4 } from 'uuid';
import type {
  AccessibilitySettings,
  ChatContext,
  SupportedLanguage,
  GateId,
  AccessibilityNeed,
} from '../types';
import { applyLanguageDirection } from '../i18n';
import i18n from '../i18n';

// ── State ─────────────────────────────────────────────────────────────────────

interface AppState {
  chatContext: ChatContext;
  accessibility: AccessibilitySettings;
  isStaffMode: boolean;
}

// ── Actions ───────────────────────────────────────────────────────────────────

type AppAction =
  | { type: 'SET_LANGUAGE'; payload: SupportedLanguage }
  | { type: 'SET_SEAT'; payload: string }
  | { type: 'SET_GATE'; payload: GateId | undefined }
  | { type: 'SET_FONT_SIZE'; payload: AccessibilitySettings['fontSize'] }
  | { type: 'TOGGLE_HIGH_CONTRAST' }
  | { type: 'TOGGLE_REDUCED_MOTION' }
  | { type: 'TOGGLE_SCREEN_READER' }
  | { type: 'TOGGLE_TEXT_TO_SPEECH' }
  | { type: 'SET_ACCESSIBILITY_NEEDS'; payload: AccessibilityNeed[] }
  | { type: 'TOGGLE_STAFF_MODE' };

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_ACCESSIBILITY: AccessibilitySettings = {
  fontSize: 'md',
  highContrast: false,
  reducedMotion: false,
  screenReaderMode: false,
  textToSpeech: false,
  accessibilityNeeds: [],
};

const DEFAULT_STATE: AppState = {
  chatContext: {
    language: 'en',
    stadiumId: 'metlife-stadium',
    sessionId: uuidv4(),
  },
  accessibility: DEFAULT_ACCESSIBILITY,
  isStaffMode: false,
};

function loadPersistedState(): Partial<AppState> {
  try {
    const raw = localStorage.getItem('fanguide-settings');
    if (!raw) return {};
    return JSON.parse(raw) as Partial<AppState>;
  } catch {
    return {};
  }
}

function getInitialState(): AppState {
  const persisted = loadPersistedState();
  return {
    ...DEFAULT_STATE,
    ...persisted,
    // Always generate a fresh session ID (privacy)
    chatContext: {
      ...DEFAULT_STATE.chatContext,
      ...(persisted.chatContext ?? {}),
      sessionId: uuidv4(),
    },
  };
}

// ── Reducer ───────────────────────────────────────────────────────────────────

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LANGUAGE':
      return {
        ...state,
        chatContext: { ...state.chatContext, language: action.payload },
      };
    case 'SET_SEAT':
      return {
        ...state,
        chatContext: { ...state.chatContext, seat: action.payload },
      };
    case 'SET_GATE':
      return {
        ...state,
        chatContext: { ...state.chatContext, gate: action.payload },
      };
    case 'SET_FONT_SIZE':
      return {
        ...state,
        accessibility: { ...state.accessibility, fontSize: action.payload },
      };
    case 'TOGGLE_HIGH_CONTRAST':
      return {
        ...state,
        accessibility: {
          ...state.accessibility,
          highContrast: !state.accessibility.highContrast,
        },
      };
    case 'TOGGLE_REDUCED_MOTION':
      return {
        ...state,
        accessibility: {
          ...state.accessibility,
          reducedMotion: !state.accessibility.reducedMotion,
        },
      };
    case 'TOGGLE_SCREEN_READER':
      return {
        ...state,
        accessibility: {
          ...state.accessibility,
          screenReaderMode: !state.accessibility.screenReaderMode,
        },
      };
    case 'TOGGLE_TEXT_TO_SPEECH':
      return {
        ...state,
        accessibility: {
          ...state.accessibility,
          textToSpeech: !state.accessibility.textToSpeech,
        },
      };
    case 'SET_ACCESSIBILITY_NEEDS':
      return {
        ...state,
        accessibility: {
          ...state.accessibility,
          accessibilityNeeds: action.payload,
        },
        chatContext: {
          ...state.chatContext,
          accessibilityNeeds: action.payload,
        },
      };
    case 'TOGGLE_STAFF_MODE':
      return { ...state, isStaffMode: !state.isStaffMode };
    default:
      return state;
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, getInitialState);

  // Apply side effects when settings change
  useEffect(() => {
    // Font size
    document.documentElement.setAttribute('data-font-size', state.accessibility.fontSize);

    // High contrast
    if (state.accessibility.highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }

    // Reduced motion (override CSS prefers-reduced-motion)
    if (state.accessibility.reducedMotion) {
      document.documentElement.style.setProperty('--animation-duration', '0ms');
    } else {
      document.documentElement.style.removeProperty('--animation-duration');
    }

    // Persist settings (no session ID — privacy)
    const toSave: Partial<AppState> = {
      chatContext: {
        ...state.chatContext,
        sessionId: '', // Strip session ID from persistence
      },
      accessibility: state.accessibility,
    };
    localStorage.setItem('fanguide-settings', JSON.stringify(toSave));
  }, [state.accessibility, state.chatContext]);

  // Apply language direction when language changes
  useEffect(() => {
    const lang = state.chatContext.language;
    i18n.changeLanguage(lang);
    applyLanguageDirection(lang);
  }, [state.chatContext.language]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

/** Hook to access the app context. Throws if used outside <AppProvider>. */
// eslint-disable-next-line react-refresh/only-export-components
export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}
