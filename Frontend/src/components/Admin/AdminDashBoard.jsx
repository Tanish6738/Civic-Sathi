import React, { useState, useMemo } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import CallDataSection from './CallDataSection';
import WebComplaintsSection from './WebComplaintsSection';
import AnalyticsDashboard from './AnalyticsDashboard';
import UserManagement from './UserManagement';
import CategoryManager from './Structure/CategoryManager';
import DepartmentManager from './Structure/DepartmentManager';
import StructureAuditPanel from './Structure/StructureAuditPanel';

// Simple tabs config so it's easy to extend later
const TABS = [
  { key: 'analytics', label: 'Analytics Overview' },
  { key: 'ai', label: 'AI Insights' },
  { key: 'users', label: 'User Management' },
  { key: 'structure', label: 'Structure Management' }
];

// Container styling assumes Tailwind (present in dependencies). Adjust if needed.
const AdminDashBoard = () => {
  const [active, setActive] = useState('analytics');
  const { theme, toggleTheme } = useTheme();

  const currentTab = useMemo(() => TABS.find(t => t.key === active) || TABS[0], [active]);

  return (
    <div className="p-4 sm:p-6 flex flex-col gap-8 bg-app rounded-xl">
      <header className="flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold tracking-tight text-gradient-primary">Admin Dashboard</h1>
            <p className="text-sm text-soft">Switch between analytics, AI insights & management tools.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} aria-label="Toggle theme" className="btn btn-outline h-10 w-10 p-0 flex items-center justify-center">
              {theme==='dark'? <Sun size={18}/> : <Moon size={18}/>}
            </button>
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"/>
      </header>

      {/* Tab List */}
      <div role="tablist" aria-label="Admin dashboard sections" className="flex flex-wrap gap-2 border-b border-default relative">
        <div className="absolute inset-x-0 bottom-0 h-[1.5px] bg-gradient-to-r from-transparent via-primary/40 to-transparent pointer-events-none"/>
        {TABS.map(tab => {
          const selected = tab.key === currentTab.key;
            return (
              <button
                key={tab.key}
                role="tab"
                aria-selected={selected}
                onClick={() => setActive(tab.key)}
                className={`relative px-4 h-10 text-sm font-medium rounded-t-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors
                  ${selected ? 'bg-surface text-primary border border-default border-b-transparent shadow-sm' : 'text-soft hover:text-primary'}
                `}
              >
                {tab.label}
                {selected && <span className="absolute inset-x-0 -bottom-[2px] h-[3px] bg-gradient-to-r from-primary via-secondary to-primary rounded-t" />}
              </button>
            );
        })}
      </div>

      {/* Tab Panels */}
      <div className="mt-2">
        {currentTab.key === 'analytics' && (
          <div role="tabpanel" className="animate-fade-in">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
              <CallDataSection />
              <WebComplaintsSection />
            </div>
          </div>
        )}
        {currentTab.key === 'ai' && (
          <div role="tabpanel" className="animate-fade-in">
            <AnalyticsDashboard />
          </div>
        )}
        {currentTab.key === 'users' && (
          <div role="tabpanel" className="animate-fade-in">
            <UserManagement />
          </div>
        )}
        {currentTab.key === 'structure' && (
          <div role="tabpanel" className="animate-fade-in flex flex-col gap-12">
            <div>
              <h2 className="text-lg font-semibold mb-3">Categories</h2>
              <CategoryManager />
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-3">Departments</h2>
              <DepartmentManager />
            </div>
            <StructureAuditPanel />
          </div>
        )}
      </div>

      {/* Tiny CSS animation (scoped) */}
      <style>{`
        .animate-fade-in{animation:fade-in .35s ease both;}
        @keyframes fade-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
        :root .bg-app .btn-outline{background:rgba(var(--ds-surface),0.55);} 
      `}</style>
    </div>
  );
};

export default AdminDashBoard;