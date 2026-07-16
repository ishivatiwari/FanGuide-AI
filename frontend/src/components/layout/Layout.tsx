/**
 * FanGuide AI — App Layout
 *
 * Provides the shell layout with:
 *   - Top header bar (logo, language switcher, staff mode toggle)
 *   - Main content area
 *   - Bottom navigation bar (mobile) / Side navigation (desktop)
 *
 * Accessibility:
 *   - <header>, <nav>, <main> semantic landmarks
 *   - aria-current on active nav link
 *   - All nav items are keyboard reachable with visible focus states
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../../context/AppContext';
import type { SupportedLanguage } from '../../types';
import { applyLanguageDirection } from '../../i18n';

interface LayoutProps {
  children: React.ReactNode;
}

const LANGUAGES: { code: SupportedLanguage; label: string; flag: string }[] = [
  { code: 'en', label: 'EN', flag: '🇺🇸' },
  { code: 'es', label: 'ES', flag: '🇪🇸' },
  { code: 'fr', label: 'FR', flag: '🇫🇷' },
  { code: 'pt', label: 'PT', flag: '🇧🇷' },
  { code: 'ar', label: 'AR', flag: '🇸🇦' },
];

export function Layout({ children }: LayoutProps) {
  const { t } = useTranslation();
  const { state, dispatch } = useAppContext();
  const location = useLocation();

  const navItems = [
    { to: '/', label: t('nav.chat'), icon: '💬', id: 'nav-chat' },
    { to: '/map', label: t('nav.map'), icon: '🗺️', id: 'nav-map' },
    { to: '/dashboard', label: t('nav.dashboard'), icon: '📊', id: 'nav-dashboard' },
    { to: '/settings', label: t('nav.settings'), icon: '⚙️', id: 'nav-settings' },
  ];

  function handleLanguageChange(lang: SupportedLanguage) {
    dispatch({ type: 'SET_LANGUAGE', payload: lang });
    applyLanguageDirection(lang);
  }

  return (
    <div className="flex flex-col min-h-dvh max-w-2xl mx-auto lg:max-w-none lg:flex-row">
      {/* ── Top Header ────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 bg-stadium-dark/95 backdrop-blur border-b border-stadium-border px-4 py-3"
        role="banner"
      >
        <div className="flex items-center justify-between max-w-2xl mx-auto lg:max-w-none">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 font-bold text-lg focus-visible:ring-2 focus-visible:ring-gold-400 rounded"
            aria-label="FanGuide AI — Home"
          >
            <span className="text-2xl" aria-hidden="true">⚽</span>
            <span className="bg-gold-gradient bg-clip-text text-transparent">
              FanGuide AI
            </span>
            <span className="hidden sm:block text-xs text-stadium-light font-normal">
              FIFA World Cup 2026
            </span>
          </Link>

          {/* Language Switcher */}
          <div className="flex items-center gap-2" role="group" aria-label="Language selection">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                aria-pressed={state.chatContext.language === lang.code}
                aria-label={`Switch to ${lang.label}`}
                className={[
                  'text-xs font-semibold px-2 py-1 rounded transition-all',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-400',
                  state.chatContext.language === lang.code
                    ? 'bg-brand-500 text-white'
                    : 'text-stadium-light hover:text-white hover:bg-stadium-muted',
                ].join(' ')}
              >
                <span aria-hidden="true">{lang.flag}</span> {lang.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <main
        id="main-content"
        className="flex-1 pb-20 lg:pb-0 lg:ml-20"
        role="main"
        tabIndex={-1} // Allow focus from skip link
      >
        {children}
      </main>

      {/* ── Bottom Nav (mobile) / Side Nav (desktop) ──────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-stadium-dark/95 backdrop-blur border-t border-stadium-border lg:fixed lg:left-0 lg:top-0 lg:bottom-0 lg:right-auto lg:w-20 lg:flex-col lg:border-t-0 lg:border-r lg:pt-20"
        aria-label="Main navigation"
        role="navigation"
      >
        <ul className="flex lg:flex-col justify-around lg:justify-start lg:gap-2 lg:p-2 lg:pt-4 max-w-2xl mx-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  id={item.id}
                  aria-current={isActive ? 'page' : undefined}
                  className={[
                    'flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all text-xs',
                    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-400',
                    isActive
                      ? 'text-brand-400 bg-brand-500/10'
                      : 'text-stadium-light hover:text-white hover:bg-stadium-muted/50',
                  ].join(' ')}
                >
                  <span className="text-xl" aria-hidden="true">{item.icon}</span>
                  <span className="text-[10px] lg:text-xs">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
