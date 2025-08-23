import React from 'react';
import { NavLink } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { Users, BarChart3, User, X, FileText, Menu, ChevronLeft } from 'lucide-react';
import adminEmails from '../data/data.json';

// Base navigation configuration (admin items appended conditionally)
const baseNavItems = [
  { to: '/users', label: 'Users', icon: Users },
  { to: '/report', label: 'Report', icon: BarChart3 },
  { to: '/my-reports', label: 'My Reports', icon: FileText },
  { to: '/profile', label: 'Profile', icon: User },
];

const SidebarTab = ({ open, setOpen }) => {
  const { isLoaded, user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const isAdmin = !!email && Array.isArray(adminEmails) && adminEmails.includes(email);
  const navItems = isAdmin ? [...baseNavItems, { to: '/admin', label: 'Admin', icon: Users }] : baseNavItems;
  return (
    <>
      {/* Sidebar / Drawer */}
      <aside
        aria-label="Primary navigation"
        role="navigation"
        className={`fixed md:sticky md:top-0 z-40 top-0 left-0 h-full md:h-screen w-72 md:w-56 bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 text-gray-100 shadow-2xl md:shadow-none border-r border-gray-800/60 transform transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : '-translate-x-full'} flex flex-col backdrop-blur`}
      >
        {/* Mobile drawer header */}
        <div className="flex md:hidden items-center justify-between px-4 h-14 border-b border-gray-800/70 bg-gray-900/70 backdrop-blur">
            <span className="font-semibold tracking-tight text-sm">Nigam Ai</span>
            <button
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center h-9 w-9 rounded-md text-gray-300 hover:text-white hover:bg-gray-800 focus:outline-none focus:ring focus:ring-gray-600/50 transition"
            >
              <X size={18} />
            </button>
        </div>
        {/* Desktop brand */}
        <div className="hidden md:flex items-center justify-between gap-2 px-5 py-5 text-lg font-semibold tracking-tight">
          <span>Nigam Ai</span>
          {/* Desktop collapse button */}
          <button
            type="button"
            aria-label="Collapse sidebar"
            onClick={() => setOpen(false)}
            className="inline-flex items-center justify-center h-8 w-8 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 focus:outline-none focus:ring focus:ring-gray-600/50 transition"
          >
            <ChevronLeft size={18} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto md:py-2 scrollbar-thin scrollbar-thumb-gray-700/70 scrollbar-track-transparent">
          <ul className="flex-col gap-1 px-3 md:px-4 py-3 md:py-0">
            {navItems.map(item => {
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={false}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) => `relative group flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium tracking-wide transition-all duration-150 outline-none focus-visible:ring focus-visible:ring-gray-600/60 ${isActive ? 'bg-gray-800/90 text-white shadow-inner' : 'text-gray-300 hover:text-white hover:bg-gray-800/70'} `}
                  >
                    {/* Active indicator bar */}
                    {({ isActive }) => null}
                    <span className="flex items-center justify-center h-6 w-6 rounded-md bg-gray-800/40 group-hover:bg-gray-700/50 text-gray-300 group-hover:text-white transition-colors">
                      <Icon size={16} className="opacity-90 group-hover:opacity-100" />
                    </span>
                    <span className="truncate">{item.label}</span>
                    {/* Left accent bar */}
                    <span className={`absolute left-0 top-1/2 -translate-y-1/2 h-7 w-0.5 rounded-full transition-opacity ${'bg-indigo-400'} opacity-0 group-[.active]:opacity-100`}></span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="hidden md:block text-[11px] text-gray-500/80 px-5 py-4 border-t border-gray-800/70">© {new Date().getFullYear()}</div>
      </aside>
      {/* Content overlay for mobile when menu open */}
      {open && (
        <button
          aria-label="Close menu overlay"
          onClick={() => setOpen(false)}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm md:hidden cursor-pointer"
        />
      )}
      {/* Floating open button when sidebar closed on desktop */}
      {!open && (
        <button
          aria-label="Open sidebar"
          onClick={() => setOpen(true)}
          className="hidden md:inline-flex fixed top-4 left-4 z-30 h-10 w-10 rounded-lg bg-gray-900/90 text-gray-200 border border-gray-700 shadow-lg hover:bg-gray-800 focus:outline-none focus:ring focus:ring-gray-600/50 transition"
        >
          <Menu size={20} />
        </button>
      )}
    </>
  );
};

export default SidebarTab;