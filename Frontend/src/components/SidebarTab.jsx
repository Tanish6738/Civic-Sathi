import React from 'react';
import { NavLink } from 'react-router-dom';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';
import SignOutButton from './SignOutButton';
import { Menu, X, ChevronLeft } from 'lucide-react';
import logo from '../assets/logo.png';

// Elegant, minimal, responsive sidebar
const SidebarTab = ({ open, setOpen, navItems, isLoaded, user, isAdmin }) => {
  const baseItem = 'group relative flex items-center gap-3 rounded-md h-11 px-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50 transition-colors';
  const accentBar = 'before:content-[""] before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-1 before:rounded-full before:scale-y-0 group-[.active]:before:scale-y-100 before:transition-transform before:origin-top';

  return (
    <aside
      className={`group/sidebar fixed md:sticky md:top-0 top-0 left-0 h-full md:h-screen z-40 flex flex-col border-r border-gray-200/70 bg-white/75 backdrop-blur-xl shadow-lg md:shadow-sm transition-[width,transform] duration-300 ease-in-out ${open ? 'w-64 md:w-60 translate-x-0' : 'w-0 md:w-16 -translate-x-full md:translate-x-0'} overflow-hidden`}
      aria-label="Sidebar navigation"
    >
      {/* Header / Brand */}
      <div className="flex items-center h-14 px-3 border-b border-gray-200/70 bg-white/60 backdrop-blur">
        {open ? (
          <>
            <NavLink
              to="/"
              className="flex items-center gap-2 font-semibold tracking-tight text-gray-800 min-w-0 hover:text-indigo-600 transition"
            >
              <img src={logo} alt="Logo" className="h-7 w-7 rounded-sm object-contain ring-1 ring-gray-200 hover:ring-indigo-300 transition" />
              <span className="truncate">Nigam AI</span>
            </NavLink>
            <div className="ml-auto flex items-center gap-1">
              <button
                aria-label="Collapse sidebar"
                onClick={() => setOpen(false)}
                className="hidden md:inline-flex items-center justify-center h-9 w-9 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 active:scale-95 transition"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                aria-label="Close sidebar"
                onClick={() => setOpen(false)}
                className="md:hidden inline-flex items-center justify-center h-9 w-9 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 active:scale-95 transition"
              >
                <X size={18} />
              </button>
            </div>
          </>
        ) : (
          <button
            aria-label="Expand sidebar"
            onClick={() => setOpen(true)}
            className="w-full flex items-center justify-center h-10 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 active:scale-95 transition"
          >
            <Menu size={20} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300/60 scrollbar-track-transparent py-4 px-2" aria-label="Primary">
        <ul className="flex flex-col gap-1">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <li key={item.to} className="relative">
                <NavLink
                  to={item.to}
                  onClick={() => !open && setOpen(true)}
                  className={({ isActive }) =>
                    `${baseItem} ${accentBar} group ${
                      isActive
                        ? 'active bg-indigo-50 text-indigo-700 before:bg-indigo-500'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 before:bg-indigo-400/70'
                    } ${!open ? 'justify-center px-0 w-11 mx-auto' : ''}`
                  }
                  aria-label={!open ? item.label : undefined}
                >
                  <span
                    className={`inline-flex items-center justify-center shrink-0 h-7 w-7 rounded-md transition-colors ${
                      open
                        ? 'bg-indigo-600/10 text-indigo-600 group-hover:bg-indigo-600/15 group-[.active]:bg-indigo-600 group-[.active]:text-white'
                        : 'text-indigo-600/80'
                    }`}
                  >
                    <Icon size={16} />
                  </span>
                  {open && <span className="truncate">{item.label}</span>}
                  {!open && (
                    <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2 py-1 rounded-md bg-gray-900 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg">
                      {item.label}
                    </span>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer / User section */}
      <div className="border-t border-gray-200/70 p-3 flex items-center gap-3 bg-white/60 backdrop-blur">
        <div className="flex-1 min-w-0">
          {isLoaded && user && open && (
            <p className="text-xs font-medium text-gray-700 leading-tight truncate">
              {user.fullName || user.username || 'User'}
            </p>
          )}
          {open && <p className="text-[10px] text-gray-400 mt-0.5">© {new Date().getFullYear()}</p>}
        </div>
        <div className="flex items-center gap-2">
          <SignedOut>
            <SignInButton mode="modal" />
          </SignedOut>
          <SignedIn>
            <UserButton appearance={{ elements: { avatarBox: 'h-8 w-8' } }} afterSignOutUrl="/" />
            {open && <SignOutButton className="bg-gray-200/70 text-gray-700 hover:bg-gray-300" />}
          </SignedIn>
        </div>
      </div>
    </aside>
  );
};

export default SidebarTab;
