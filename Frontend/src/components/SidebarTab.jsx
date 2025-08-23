import React from 'react';
import { NavLink } from 'react-router-dom';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';
import SignOutButton from './SignOutButton';
import { Menu, X, Home, ChevronLeft } from 'lucide-react';

// Sidebar navigation component
const SidebarTab = ({ open, setOpen, navItems, isLoaded, user }) => {
  return (
    <aside className={`group/sidebar fixed md:sticky md:top-0 top-0 left-0 h-full md:h-screen z-40 flex flex-col border-r border-gray-200/70 bg-white/80 backdrop-blur-xl shadow-lg md:shadow-sm transition-all duration-300 ease-in-out ${open ? 'w-72 md:w-60 translate-x-0' : 'w-0 md:w-16 -translate-x-full md:translate-x-0'} overflow-hidden`}>
      <div className="flex items-center h-14 px-4 border-b border-gray-200/70 bg-white/60 backdrop-blur">
        {open ? (
          <>
            <NavLink to="/" className="flex items-center gap-2 font-semibold tracking-tight text-gray-800 min-w-0">
              <Home size={18} />
              <span className="truncate">Nigam Ai</span>
            </NavLink>
            <div className="ml-auto flex items-center gap-2">
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
      <nav className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent py-4 px-2">
        <ul className="flex flex-col gap-1">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={() => !open && setOpen(true)}
                  className={({isActive})=>`group relative flex items-center gap-3 rounded-lg h-11 px-3 text-sm font-medium transition-colors outline-none focus-visible:ring focus-visible:ring-indigo-400/50 ${isActive ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'} ${!open ? 'justify-center px-0 w-11 mx-auto' : ''}`}
                >
                  <span className={`inline-flex items-center justify-center shrink-0 h-7 w-7 rounded-md ${open ? 'bg-indigo-600/15 text-indigo-600 group-hover:bg-indigo-600/20 group-[.active]:bg-white/20 group-[.active]:text-white' : 'bg-transparent'} transition-colors`}>
                    <Icon size={16} />
                  </span>
                  {open && <span className="truncate">{item.label}</span>}
                  {!open && (
                    <span className="pointer-events-none absolute left-full ml-3 px-2 py-1 rounded-md bg-gray-900 text-white text-xs font-medium opacity-0 group-hover:opacity-100 translate-y-0 transition-opacity whitespace-nowrap shadow-lg">
                      {item.label}
                    </span>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-gray-200/70 p-4 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          {isLoaded && user && open && (
            <p className="text-xs font-medium text-gray-600 leading-tight truncate">{user.fullName || user.username || 'User'}</p>
          )}
          {open && <p className="text-[10px] text-gray-400">© {new Date().getFullYear()}</p>}
        </div>
        <div className="flex items-center gap-2">
          <SignedOut>
            <SignInButton mode="modal" />
          </SignedOut>
          <SignedIn>
            <UserButton appearance={{ elements: { avatarBox: 'h-8 w-8' } }} afterSignOutUrl="/" />
            {open && <SignOutButton className="bg-rose-100 text-rose-700 hover:bg-rose-200" />}
          </SignedIn>
        </div>
      </div>
    </aside>
  );
};

export default SidebarTab;
