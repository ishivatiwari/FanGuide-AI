/**
 * FanGuide AI — Settings Page
 *
 * Allows fans to customize:
 *   - Language (also changes AI response language)
 *   - Accessibility needs (shared with AI context)
 *   - Font size (small/medium/large/extra-large)
 *   - High contrast mode
 *   - Reduced motion
 *   - Screen reader mode
 *   - Text-to-speech for AI replies
 *   - Seat and gate info (used in every AI request as context)
 *
 * All settings are persisted to localStorage via AppContext.
 * Accessibility needs are sent to the backend with every chat request
 * so the AI can tailor its responses appropriately.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../context/AppContext';
import type { SupportedLanguage, AccessibilityNeed, GateId } from '../types';
import { clsx } from 'clsx';

const LANGUAGES: { code: SupportedLanguage; label: string; nativeLabel: string }[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español' },
  { code: 'fr', label: 'French', nativeLabel: 'Français' },
  { code: 'pt', label: 'Portuguese', nativeLabel: 'Português' },
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية' },
];

const GATES: GateId[] = ['gate-A', 'gate-B', 'gate-C', 'gate-D', 'gate-E', 'gate-F', 'gate-G', 'gate-H'];

const ACCESSIBILITY_NEEDS: AccessibilityNeed[] = [
  'wheelchair', 'mobility-aid', 'visual-impairment',
  'hearing-impairment', 'sensory-sensitivity', 'other',
];

function ToggleSwitch({
  checked,
  onChange,
  id,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  id: string;
  label: string;
}) {
  return (
    <label
      htmlFor={id}
      className="flex items-center justify-between cursor-pointer group"
    >
      <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
        {label}
      </span>
      <button
        role="switch"
        id={id}
        aria-checked={checked}
        onClick={onChange}
        className={clsx(
          'relative w-12 h-6 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-400',
          checked ? 'bg-brand-500' : 'bg-stadium-muted'
        )}
      >
        <span
          className={clsx(
            'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
            checked ? 'translate-x-6' : 'translate-x-0'
          )}
          aria-hidden="true"
        />
        <span className="sr-only">{checked ? 'On' : 'Off'}</span>
      </button>
    </label>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass-card rounded-xl p-4 space-y-4">
      <h2 className="text-sm font-semibold text-gold-400 uppercase tracking-wider">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function SettingsPage() {
  const { t } = useTranslation();
  const { state, dispatch } = useAppContext();
  const { chatContext, accessibility } = state;

  function toggleNeed(need: AccessibilityNeed) {
    const current = accessibility.accessibilityNeeds ?? [];
    const updated = current.includes(need)
      ? current.filter((n) => n !== need)
      : [...current, need];
    dispatch({ type: 'SET_ACCESSIBILITY_NEEDS', payload: updated });
  }

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-white">{t('settings.title')}</h1>

      {/* ── My Info ────────────────────────────────────────────────────────── */}
      <SettingsSection title={t('settings.myInfo')}>
        <div className="space-y-3">
          <div>
            <label htmlFor="seat-input" className="block text-sm text-gray-300 mb-1">
              {t('settings.seat')}
            </label>
            <input
              id="seat-input"
              type="text"
              value={chatContext.seat ?? ''}
              onChange={(e) => dispatch({ type: 'SET_SEAT', payload: e.target.value })}
              placeholder={t('settings.seat.placeholder')}
              className="w-full bg-stadium-dark border border-stadium-border rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-stadium-light focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-brand-500/60 transition-all"
              aria-label={t('settings.seat')}
            />
          </div>

          <div>
            <label htmlFor="gate-select" className="block text-sm text-gray-300 mb-1">
              {t('settings.gate')}
            </label>
            <select
              id="gate-select"
              value={chatContext.gate ?? ''}
              onChange={(e) =>
                dispatch({ type: 'SET_GATE', payload: e.target.value as GateId || undefined })
              }
              className="w-full bg-stadium-dark border border-stadium-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/60 transition-all"
              aria-label={t('settings.gate')}
            >
              <option value="">{t('settings.gate.none')}</option>
              {GATES.map((g) => (
                <option key={g} value={g}>
                  Gate {g.replace('gate-', '').toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>
      </SettingsSection>

      {/* ── Language ───────────────────────────────────────────────────────── */}
      <SettingsSection title={t('settings.language')}>
        <div
          className="grid grid-cols-1 gap-2"
          role="radiogroup"
          aria-label="Select language"
        >
          {LANGUAGES.map((lang) => {
            const isSelected = chatContext.language === lang.code;
            return (
              <button
                key={lang.code}
                role="radio"
                aria-checked={isSelected}
                onClick={() => dispatch({ type: 'SET_LANGUAGE', payload: lang.code })}
                className={clsx(
                  'flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-all',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-400',
                  isSelected
                    ? 'border-brand-500 bg-brand-500/10 text-white'
                    : 'border-stadium-border text-gray-300 hover:border-stadium-muted hover:text-white'
                )}
              >
                <span>{lang.label}</span>
                <span className={isSelected ? 'text-gold-400 font-bold' : 'text-stadium-light'}>
                  {lang.nativeLabel}
                </span>
              </button>
            );
          })}
        </div>
      </SettingsSection>

      {/* ── Accessibility Needs ─────────────────────────────────────────────── */}
      <SettingsSection title={t('settings.accessibilityNeeds')}>
        <p className="text-xs text-stadium-light">
          Selected needs are shared with FanGuide AI to tailor routes and information.
        </p>
        <div
          className="grid grid-cols-2 gap-2"
          role="group"
          aria-label="Accessibility needs"
        >
          {ACCESSIBILITY_NEEDS.map((need) => {
            const isSelected = (accessibility.accessibilityNeeds ?? []).includes(need);
            return (
              <button
                key={need}
                aria-pressed={isSelected}
                onClick={() => toggleNeed(need)}
                className={clsx(
                  'px-3 py-2 rounded-xl border text-xs transition-all text-left',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-400',
                  isSelected
                    ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                    : 'border-stadium-border text-gray-400 hover:text-white hover:border-stadium-muted'
                )}
              >
                {t(`settings.needs.${need}` as 'settings.needs.wheelchair')}
                {isSelected && <span className="float-right" aria-hidden="true">✓</span>}
              </button>
            );
          })}
        </div>
      </SettingsSection>

      {/* ── Display Settings ────────────────────────────────────────────────── */}
      <SettingsSection title={t('settings.accessibility')}>
        {/* Font size */}
        <div>
          <p className="text-sm text-gray-300 mb-2" id="font-size-label">
            {t('settings.fontSize')}
          </p>
          <div
            className="grid grid-cols-4 gap-1"
            role="radiogroup"
            aria-labelledby="font-size-label"
          >
            {(['sm', 'md', 'lg', 'xl'] as const).map((size) => (
              <button
                key={size}
                role="radio"
                aria-checked={accessibility.fontSize === size}
                onClick={() => dispatch({ type: 'SET_FONT_SIZE', payload: size })}
                className={clsx(
                  'py-2 rounded-lg text-xs font-medium transition-all',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-400',
                  accessibility.fontSize === size
                    ? 'bg-brand-500 text-white'
                    : 'bg-stadium-muted text-gray-400 hover:text-white'
                )}
              >
                {t(`settings.fontSize.${size}` as 'settings.fontSize.sm')}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4 pt-2 border-t border-stadium-border">
          <ToggleSwitch
            id="high-contrast-toggle"
            checked={accessibility.highContrast}
            onChange={() => dispatch({ type: 'TOGGLE_HIGH_CONTRAST' })}
            label={t('settings.highContrast')}
          />
          <ToggleSwitch
            id="reduced-motion-toggle"
            checked={accessibility.reducedMotion}
            onChange={() => dispatch({ type: 'TOGGLE_REDUCED_MOTION' })}
            label={t('settings.reducedMotion')}
          />
          <ToggleSwitch
            id="screen-reader-toggle"
            checked={accessibility.screenReaderMode}
            onChange={() => dispatch({ type: 'TOGGLE_SCREEN_READER' })}
            label={t('settings.screenReader')}
          />
          <ToggleSwitch
            id="tts-toggle"
            checked={accessibility.textToSpeech}
            onChange={() => dispatch({ type: 'TOGGLE_TEXT_TO_SPEECH' })}
            label={t('settings.textToSpeech')}
          />
        </div>
      </SettingsSection>

      {/* WCAG Note */}
      <div className="glass-card rounded-xl p-4 border border-brand-500/20">
        <p className="text-xs text-stadium-light leading-relaxed">
          <span className="text-brand-300 font-medium">Accessibility</span> — This app targets WCAG 2.1 AA compliance.
          All interactive elements are keyboard-navigable with visible focus indicators.
          ARIA labels are applied throughout. For in-venue assistance, contact any steward
          or visit the Sign Language Help Points at Gates A and C.
        </p>
      </div>
    </div>
  );
}
