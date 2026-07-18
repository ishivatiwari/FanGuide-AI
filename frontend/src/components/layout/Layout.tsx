/**
 * FanGuide AI — App Layout
 *
 * Provides the shell layout with:
 *   - Top header bar (logo, language switcher)
 *   - Sidebar navigation on desktop (left-aligned, 72px) — stateful, with Gate badge
 *   - Right context panel slot (only on chat route, 304px)
 *   - Main content area filling the remaining space
 *   - Bottom navigation on mobile
 *
 * 3-zone desktop structure:
 *   [sidebar 72px] | [main flex-1] | [context panel 304px — chat only]
 *
 * Accessibility:
 *   - <header>, <nav>, <main> semantic landmarks
 *   - aria-current on active nav link
 *   - All nav items keyboard reachable with visible focus states
 *   - Accessibility nav item has a visible ♿ badge
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../../context/AppContext';
import type { SupportedLanguage } from '../../types';
import { applyLanguageDirection } from '../../i18n';
import { clsx } from 'clsx';
import { ContextPanel } from './ContextPanel';
import type { ToolCallAttachment } from '../../types';

interface LayoutProps {
  children: React.ReactNode;
  /** Latest tool attachment pushed up from ChatPage for the context panel */
  latestToolAttachment?: ToolCallAttachment | null;
}

const LANGUAGES: { code: SupportedLanguage; label: string; flag: string }[] = [
  { code: 'en', label: 'EN', flag: '🇺🇸' },
  { code: 'es', label: 'ES', flag: '🇲🇽' },
  { code: 'fr', label: 'FR', flag: '🇫🇷' },
  { code: 'pt', label: 'PT', flag: '🇧🇷' },
  { code: 'ar', label: 'AR', flag: '🇸🇦' },
];

interface NavItem {
  to: string;
  label: string;
  id: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
      <line x1="9" y1="3" x2="9" y2="18" />
      <line x1="15" y1="6" x2="15" y2="21" />
    </svg>
  );
}

function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function A11yIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <circle cx="12" cy="4" r="2" />
      <path d="M12 6v6l-2 4M12 12l2 4M5 8.5l7-1.5 7 1.5" />
    </svg>
  );
}

// ── Sidebar Nav Item ───────────────────────────────────────────────────────────

function SidebarNavItem({ item, isActive }: { item: NavItem; isActive: boolean }) {
  return (
    <li className="w-full relative">
      <Link
        to={item.to}
        id={item.id}
        aria-current={isActive ? 'page' : undefined}
        className={clsx(
          'relative flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all w-full text-center group',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-400',
          isActive
            ? 'text-white bg-brand-500/12'
            : 'text-stadium-light hover:text-white hover:bg-stadium-muted/20',
        )}
      >
        {/* Icon with glow on active */}
        <span
          className={clsx(
            'transition-all duration-200',
            isActive
              ? 'text-gold-400 drop-shadow-[0_0_10px_rgba(255,200,10,0.5)]'
              : 'group-hover:text-white group-hover:scale-110',
          )}
          style={{ display: 'block', transition: 'transform 0.2s, filter 0.2s, color 0.2s' }}
        >
          {item.icon}
        </span>
        <span className="text-[9px] tracking-wide uppercase font-semibold leading-none">
          {item.label}
        </span>

        {/* Badge (for accessibility item) */}
        {item.badge && item.badge}

        {/* Active indicator — gold right stripe */}
        {isActive && (
          <span className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-8 rounded-l-full bg-gradient-to-b from-gold-400 to-brand-500" />
        )}
      </Link>
    </li>
  );
}

// ── Layout ─────────────────────────────────────────────────────────────────────

export function Layout({ children }: LayoutProps) {
  const { t } = useTranslation();
  const { state, dispatch } = useAppContext();
  const location = useLocation();

  const isChat = location.pathname === '/';
  const userZone = state.chatContext.gate?.replace('gate-', 'Gate ').toUpperCase() || 'Gate A';

  function handleLanguageChange(lang: SupportedLanguage) {
    dispatch({ type: 'SET_LANGUAGE', payload: lang });
    applyLanguageDirection(lang);
  }

  const navItems: NavItem[] = [
    { to: '/',          label: t('nav.chat'),      id: 'nav-chat',      icon: <ChatIcon /> },
    { to: '/map',       label: t('nav.map'),        id: 'nav-map',       icon: <MapIcon /> },
    { to: '/dashboard', label: t('nav.dashboard'),  id: 'nav-dashboard', icon: <DashboardIcon /> },
    {
      to: '/settings',
      label: t('nav.settings'),
      id: 'nav-settings',
      icon: <A11yIcon />,
      badge: (
        <span
          className="absolute top-1 right-1.5 w-4 h-4 rounded-full bg-pitch-500/20 border border-pitch-500/40
            flex items-center justify-center text-[8px] text-pitch-400 font-bold"
          aria-label="Accessibility settings"
        >
          ♿
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col min-h-dvh text-white">
      {/* ── Top Header ────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 w-full animate-fade-in"
        role="banner"
        style={{ animationDelay: 'var(--stagger-header)' }}
      >
        <div
          className="glass-card-bright border-b border-stadium-border/40 px-4 py-2.5"
          style={{ borderTopWidth: 0, borderLeftWidth: 0, borderRightWidth: 0 }}
        >
          <div className="flex items-center justify-between w-full pl-[72px]">
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center gap-2.5 focus-visible:ring-2 focus-visible:ring-gold-400 rounded-lg p-1 transition-all group"
              aria-label="FanGuide AI — Home"
            >
              <div className="relative w-8 h-8 flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-gold-gradient flex items-center justify-center text-lg shadow-gold-glow group-hover:shadow-gold-glow-lg transition-all">
                  ⚽
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-brand-gradient flex items-center justify-center text-[7px] border border-stadium-dark shadow font-bold">
                  AI
                </span>
              </div>

              <div className="flex flex-col">
                <span
                  className="font-extrabold text-sm tracking-tight leading-none"
                  style={{
                    background: 'linear-gradient(90deg, #ffc80a 0%, #ffd84d 40%, #ffffff 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  FanGuide AI
                </span>
                <span className="hidden sm:block text-[8px] text-stadium-light font-medium tracking-widest uppercase leading-tight">
                  FIFA World Cup 2026
                </span>
              </div>
            </Link>

            {/* Center: Gate badge (always visible) */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gold-500/20 bg-gold-400/5">
              <span className="w-1.5 h-1.5 rounded-full bg-pitch-400 animate-pulse" aria-hidden="true" />
              <span className="font-data text-[10px] font-bold text-gold-400 tracking-wider">
                {userZone} · ZONE 2
              </span>
              <span className="text-[9px] text-stadium-light">MetLife Stadium</span>
            </div>

            {/* Language Switcher */}
            <div
              className="flex items-center gap-0.5 bg-stadium-card/50 border border-stadium-border rounded-xl p-0.5"
              role="group"
              aria-label="Language selection"
            >
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  aria-pressed={state.chatContext.language === lang.code}
                  aria-label={`Switch to ${lang.label}`}
                  className={clsx(
                    'text-[10px] font-bold px-2 py-1 rounded-lg transition-all',
                    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-400',
                    state.chatContext.language === lang.code
                      ? 'bg-brand-gradient text-white shadow-brand-glow'
                      : 'text-stadium-light hover:text-white hover:bg-stadium-muted/50',
                  )}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {/* Gradient accent under header */}
        <div className="h-px bg-gradient-to-r from-transparent via-gold-500/20 to-transparent" />
      </header>

      {/* ── Main Layout Body ─────────────────────────────────────────────── */}
      <div className="flex flex-1 w-full relative min-h-0">

        {/* ── Desktop Sidebar ───────────────────────────────────────────── */}
        <nav
          className="hidden lg:flex flex-col items-center fixed top-[57px] bottom-0 left-0 w-[72px] z-30
            border-r border-stadium-border/40 bg-stadium-panel/90 backdrop-blur-sm animate-sidebar-in"
          aria-label="Main navigation"
          role="navigation"
        >
          {/* Nav items */}
          <ul className="flex flex-col items-center gap-0.5 w-full px-2 pt-5 flex-1">
            {navItems.map((item) => (
              <SidebarNavItem
                key={item.to}
                item={item}
                isActive={location.pathname === item.to}
              />
            ))}
          </ul>

          {/* Bottom: trophy watermark */}
          <div className="flex flex-col items-center gap-1 mb-4 opacity-25">
            <div className="text-lg">🏆</div>
            <span className="font-data text-[7px] text-stadium-light tracking-widest uppercase">2026</span>
          </div>
        </nav>

        {/* ── Mobile Bottom Navigation ──────────────────────────────────── */}
        <nav
          className="fixed bottom-0 left-0 right-0 z-40 lg:hidden"
          aria-label="Main navigation"
          role="navigation"
        >
          <div className="h-px bg-gradient-to-r from-transparent via-brand-500/30 to-transparent" />
          <div
            className="glass-card-bright border-t border-stadium-border/40"
            style={{ borderBottomWidth: 0, borderLeftWidth: 0, borderRightWidth: 0 }}
          >
            <ul className="flex justify-around max-w-2xl mx-auto w-full px-2 py-1.5">
              {navItems.map((item) => {
                const isActive = location.pathname === item.to;
                return (
                  <li key={item.to} className="relative">
                    <Link
                      to={item.to}
                      id={`${item.id}-mobile`}
                      aria-current={isActive ? 'page' : undefined}
                      className={clsx(
                        'flex flex-col items-center gap-1 py-1.5 px-4 rounded-xl transition-all',
                        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-400',
                        isActive ? 'text-gold-400' : 'text-stadium-light hover:text-white',
                      )}
                    >
                      <span className={clsx(
                        'transition-all duration-200',
                        isActive && 'drop-shadow-[0_0_8px_rgba(255,200,10,0.5)]',
                      )}>
                        {item.icon}
                      </span>
                      <span className="text-[9px] tracking-wide uppercase font-semibold leading-none">
                        {item.label}
                      </span>
                      {isActive && (
                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-gold-400 shadow-gold-glow" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        {/* ── Content + Right Panel wrapper ─────────────────────────────── */}
        <div className={clsx(
          'flex flex-1 min-h-0',
          'lg:pl-[72px]', // offset for sidebar
        )}>
          {/* Main Content */}
          <main
            id="main-content"
            className={clsx(
              'flex-1 min-w-0 animate-main-in',
              'pb-24 lg:pb-0',
              // When chat route: leave room for right panel
              isChat ? 'lg:pr-0' : '',
            )}
            role="main"
            tabIndex={-1}
          >
            <div className={clsx(
              'h-full',
              isChat ? 'lg:mr-[304px]' : '',
            )}>
              {children}
            </div>
          </main>

          {/* ── Right Context Panel (chat page only, desktop only) ───────── */}
          {isChat && (
            <aside
              className="hidden lg:block fixed top-[57px] right-0 bottom-0 w-[304px]
                bg-stadium-panel/95 border-l border-stadium-border/40 backdrop-blur-sm overflow-hidden"
              aria-label="Live context sidebar"
            >
              <ContextPanel userZone={userZone} />
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
