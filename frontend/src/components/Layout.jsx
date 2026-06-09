import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAppSettings } from '../App';

const NAV = [
  { to: '/', label: 'לוח בקרה', icon: HomeIcon, end: true },
  { to: '/quotes/new', label: 'הצעה חדשה +', icon: PlusIcon, highlight: true },
  { to: '/templates', label: 'תבניות', icon: TemplateIcon },
  { to: '/payment-summaries', label: 'סיכומי תשלום', icon: InvoiceIcon },
  { to: '/settings', label: 'הגדרות', icon: SettingsIcon },
];

function HomeIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}
function TemplateIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
    </svg>
  );
}
function InvoiceIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}
function SettingsIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

export default function Layout() {
  const { settings } = useAppSettings();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const logoPath = settings?.logo_path;
  const businessName = settings?.business_name || 'OrrDDM';
  const tagline = settings?.tagline || 'Design · Development · Management';
  const brandColor = settings?.brand_color || '#D4642A';

  return (
    <div className="flex min-h-screen bg-surface">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 right-0 z-40 flex flex-col w-60 bg-white border-l border-gray-100 shadow-sm transition-transform duration-200
          ${mobileOpen ? 'translate-x-0' : 'translate-x-full'} lg:relative lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="flex flex-col items-center pt-8 pb-6 px-5 border-b border-gray-100">
          {logoPath ? (
            <img src={logoPath} alt={businessName} className="h-10 object-contain mb-2" />
          ) : (
            <div className="text-2xl font-bold" style={{ color: brandColor }}>
              {businessName}
            </div>
          )}
          {tagline && <p className="text-xs text-gray-400 mt-1 text-center">{tagline}</p>}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-1">
            {NAV.map(({ to, label, icon: Icon, end, highlight }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                      highlight
                        ? 'bg-brand text-white hover:bg-brand-600'
                        : isActive
                        ? 'bg-brand/10 text-brand'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`
                  }
                >
                  <Icon />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center">OrrDDM Quote Studio v1.0</p>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 sticky top-0 z-20">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-bold text-lg" style={{ color: brandColor }}>{businessName}</span>
          <div className="w-9" />
        </header>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
