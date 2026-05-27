import React, { createContext, useContext, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getSettings } from './api';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import QuoteBuilder from './pages/QuoteBuilder';
import QuoteView from './pages/QuoteView';
import Templates from './pages/Templates';
import Settings from './pages/Settings';

export const SettingsContext = createContext({});
export const useAppSettings = () => useContext(SettingsContext);

export default function App() {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    getSettings().then(setSettings).catch(() => setSettings({}));
  }, []);

  // Apply brand color as CSS variable
  useEffect(() => {
    if (settings?.brand_color) {
      document.documentElement.style.setProperty('--brand', settings.brand_color);
    }
  }, [settings?.brand_color]);

  if (!settings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">טוען...</p>
        </div>
      </div>
    );
  }

  return (
    <SettingsContext.Provider value={{ settings, setSettings }}>
      <BrowserRouter>
        <Routes>
          {/* Public quote view — no sidebar */}
          <Route path="/p/:token" element={<QuoteView />} />
          {/* App routes with sidebar layout */}
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="/quotes/new" element={<QuoteBuilder />} />
            <Route path="/quotes/:id/edit" element={<QuoteBuilder />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </SettingsContext.Provider>
  );
}
