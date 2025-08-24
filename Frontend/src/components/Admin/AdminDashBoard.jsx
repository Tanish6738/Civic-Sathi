import React, { useState, useMemo } from 'react';
import CallDataSection from './CallDataSection';
import WebComplaintsSection from './WebComplaintsSection';
import UserManagement from './UserManagement';

// Simple tabs config so it's easy to extend later
const TABS = [
  { key: 'analytics', label: 'Analytics Overview' },
  { key: 'users', label: 'User Management' }
];

// Container styling assumes Tailwind (present in dependencies). Adjust if needed.
const AdminDashBoard = () => {
  const [active, setActive] = useState('analytics');

  const currentTab = useMemo(() => TABS.find(t => t.key === active) || TABS[0], [active]);

  return (
    <div className="p-6 flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-sm text-gray-500">Switch between analytics and management tools.</p>
      </header>

      {/* Tab List */}
      <div role="tablist" aria-label="Admin dashboard sections" className="flex flex-wrap gap-2 border-b border-gray-200">
        {TABS.map(tab => {
          const selected = tab.key === currentTab.key;
            return (
              <button
                key={tab.key}
                role="tab"
                aria-selected={selected}
                onClick={() => setActive(tab.key)}
                className={`relative px-4 h-10 text-sm font-medium rounded-t-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors
                  ${selected ? 'bg-white text-indigo-600 border border-b-white border-gray-200 shadow-sm' : 'text-gray-600 hover:text-indigo-600'}
                `}
              >
                {tab.label}
                {selected && <span className="absolute inset-x-0 -bottom-px h-[3px] bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-t" />}
              </button>
            );
        })}
      </div>

      {/* Tab Panels */}
      <div className="mt-2">
        {currentTab.key === 'analytics' && (
          <div role="tabpanel" className="animate-fade-in">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 items-start">
              <CallDataSection />
              <WebComplaintsSection />
            </div>
          </div>
        )}
        {currentTab.key === 'users' && (
          <div role="tabpanel" className="animate-fade-in">
            <UserManagement />
          </div>
        )}
      </div>

      {/* Tiny CSS animation (scoped) */}
      <style>{`
        .animate-fade-in{animation:fade-in .35s ease both;}
        @keyframes fade-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
    </div>
  );
};

export default AdminDashBoard;