/**
 * FanGuide AI — App Layout
 *
 * Provides the shell layout with:
 *   - Top header bar (logo, language switcher)
 *   - Sidebar navigation on desktop (left-aligned) / Bottom navigation on mobile
 *   - Main content area aligned with safe paddings to prevent overlapping
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

const LANGUAGES: { code: SupportedLanguage; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' },
  { code: 'fr', label: 'FR' },
  { code: 'pt', label: 'PT' },
  { code: 'ar', label: 'AR' },
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
    <div className="flex flex-col min-h-dvh bg-stadium-dark text-white">
      {/* ── Top Header ────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 bg-stadium-dark/95 backdrop-blur border-b border-stadium-border px-4 py-3 w-full"
        role="banner"
      >
        <div className="flex items-center justify-between max-w-6xl mx-auto w-full">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 font-bold text-lg focus-visible:ring-2 focus-visible:ring-gold-400 rounded-lg p-1 transition-all"
            aria-label="FanGuide AI — Home"
          >
            <span className="text-2xl" aria-hidden="true">⚽</span>
            <span className="bg-gold-gradient bg-clip-text text-transparent font-extrabold tracking-wide">
              FanGuide AI
            </span>
            <span className="hidden sm:inline-block text-[10px] text-stadium-light font-medium bg-stadium-border px-2 py-0.5 rounded-full border border-stadium-muted">
              FIFA World Cup 2026
            </span>
          </Link>

          {/* Language Switcher */}
          <div className="flex items-center gap-1.5" role="group" aria-label="Language selection">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                aria-pressed={state.chatContext.language === lang.code}
                aria-label={`Switch to ${lang.label}`}
                className={[
                  'text-[10px] font-bold px-2 py-1 rounded transition-all border',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-400',
                  state.chatContext.language === lang.code
                    ? 'bg-brand-500 text-white border-brand-500 shadow-brand-glow'
                    : 'text-stadium-light border-stadium-border hover:text-white hover:bg-stadium-muted/50',
                ].join(' ')}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── Main Layout Body ─────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col lg:flex-row w-full max-w-6xl mx-auto relative">
        {/* Navigation Sidebar (Desktop) / Bottom Nav (Mobile) */}
        <nav
          className={[
            'fixed bottom-0 left-0 right-0 z-40 bg-stadium-dark/95 backdrop-blur border-t border-stadium-border',
            'lg:absolute lg:top-0 lg:bottom-0 lg:left-0 lg:right-auto lg:w-20 lg:h-full lg:border-t-0 lg:border-r lg:pt-6',
          ].join(' ')}
          aria-label="Main navigation"
          role="navigation"
        >
          <ul className="flex lg:flex-col justify-around lg:justify-start lg:gap-4 lg:p-2 max-w-2xl mx-auto w-full">
            {navItems.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <li key={item.to} className="w-full">
                  <Link
                    to={item.to}
                    id={item.id}
                    aria-current={isActive ? 'page' : undefined}
                    className={[
                      'flex flex-col items-center gap-1.5 py-2 px-3 rounded-xl transition-all text-xs font-semibold w-full text-center',
                      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-400',
                      isActive
                        ? 'text-brand-400 bg-brand-500/10'
                        : 'text-stadium-light hover:text-white hover:bg-stadium-muted/40',
                    ].join(' ')}
                  >
                    <span className="text-xl mb-0.5" aria-hidden="true">{item.icon}</span>
                    <span className="text-[9px] lg:text-[10px] tracking-wide uppercase">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Content Area */}
        <main
          id="main-content"
          className="flex-1 pb-24 px-4 pt-4 lg:pl-24 lg:pr-4 lg:pb-8 lg:pt-6 w-full min-w-0"
          role="main"
          tabIndex={-1} // Allow focus from skip link
        >
          {children}
        </main>
      </div>
    </div>
  );
}
