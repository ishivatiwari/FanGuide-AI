/**
 * FanGuide AI — Root Application Component
 *
 * Defines the main routing structure:
 *   / (index)       → ChatPage (the fan-facing assistant)
 *   /map            → MapPage (stadium map with density overlay)
 *   /settings       → SettingsPage (accessibility + language + profile)
 *   /dashboard      → DashboardPage (staff/volunteer operational view)
 *
 * The bottom navigation is always visible on mobile.
 * The layout adapts to desktop with a sidebar navigation.
 */

import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { ChatPage } from './pages/ChatPage';
import { MapPage } from './pages/MapPage';
import { SettingsPage } from './pages/SettingsPage';
import { DashboardPage } from './pages/DashboardPage';

export default function App() {

  return (
    <div
      className="min-h-dvh bg-stadium-dark text-white font-sans"
      // Semantic lang attribute is set dynamically by applyLanguageDirection
      aria-label="FanGuide AI Application"
    >
      {/* Skip to content — WCAG 2.1 success criterion 2.4.1 */}
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>

      <Layout>
        <Routes>
          <Route path="/" element={<ChatPage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
      </Layout>
    </div>
  );
}
