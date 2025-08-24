import React, { useState, useMemo } from "react";
import { NavLink } from 'react-router-dom';
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from '@clerk/clerk-react';
import adminEmails from '../../data/data.json';
import SignOutButton from "../SignOutButton";
// Central nav list (user scope)
const BASE_LINKS = [
  { to: '/categories', label: 'Services' },
  { to: '/report', label: 'Report' },
  { to: '/my-reports', label: 'My Reports' },
  { to: '/profile', label: 'Profile' },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isLoaded, user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const isAdmin = !!email && Array.isArray(adminEmails) && adminEmails.includes(email);

  const links = useMemo(()=>{
    return isAdmin ? [...BASE_LINKS, { to: '/admin', label: 'Admin' }, { to: '/admin/reports', label: 'All Reports' }] : BASE_LINKS;
  },[isAdmin]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="flex justify-between items-center px-4 sm:px-6 py-3 bg-white/90 backdrop-blur shadow-sm relative gap-4">
      <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
        <h1 className="text-2xl font-extrabold text-purple-600">
          Nigam Ai
        </h1>
          </div>

      {/* Desktop nav links */}
      <nav className="hidden md:flex items-center gap-3 text-sm font-medium">
        {links.map(l => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({isActive})=>`px-3 py-1.5 rounded-md transition ${isActive? 'bg-indigo-600 text-white':'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
          >
            {l.label}
          </NavLink>
        ))}
      </nav>

      {/* Right side auth */}
      <div className="hidden md:flex items-center gap-3">
        <SignedOut>
          <SignInButton mode="modal">
            <button className="px-4 py-1.5 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 active:scale-95 transition">Sign In</button>
          </SignInButton>
        </SignedOut>
        <SignedIn>
          <UserButton appearance={{ elements: { avatarBox: 'h-9 w-9' } }} afterSignOutUrl="/" />
          <SignOutButton className="h-9 text-xs" />
        </SignedIn>
      </div>

      {/* Mobile menu toggle */}
      <button
        aria-label={menuOpen ? "Close menu" : "Open menu"}
        onClick={() => setMenuOpen(o => !o)}
        className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 active:scale-95 transition"
      >
        <span className="sr-only">Menu</span>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-6 h-6">
          {menuOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
          )}
        </svg>
      </button>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-white/95 backdrop-blur shadow-lg border-t border-gray-200 animate-slideDown origin-top z-40">
          <div className="flex flex-col p-4 gap-2">
            {links.map(l => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={closeMenu}
                className={({isActive})=>`w-full text-left px-4 py-2 rounded-md text-sm font-medium transition ${isActive? 'bg-indigo-600 text-white':'text-gray-700 hover:bg-gray-100'}`}
              >
                {l.label}
              </NavLink>
            ))}
            <div className="pt-2 border-t border-gray-200 mt-1 flex items-center gap-3">
              <SignedOut>
                <SignInButton mode="modal">
                  <button onClick={closeMenu} className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-500 active:scale-[.97] transition">Sign In</button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <div className="flex items-center gap-3 w-full justify-between">
                  <UserButton appearance={{ elements: { avatarBox: 'h-10 w-10' } }} afterSignOutUrl="/" />
                  <SignOutButton className="flex-1 justify-center h-10 text-xs" />
                </div>
              </SignedIn>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
