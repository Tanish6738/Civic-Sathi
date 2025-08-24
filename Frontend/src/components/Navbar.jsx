import React, { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { Menu, Home, FileText, Layers, Shield, ListChecks } from 'lucide-react';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';
import SignOutButton from './SignOutButton';
import { motion } from 'framer-motion';
import logo from '../assets/logo.png';

// Professional, minimal & responsive top navigation bar
const Navbar = ({ open, setOpen, isAdmin }) => {
  const hasSidebar = typeof setOpen === 'function';
  // Removed GSAP entrance animation to prevent inline transform/opacity styles from being injected

  // Central nav configuration (only key, label, to, icon)
  const navItems = useMemo(() => {
    const base = [
      { key: 'services', label: 'Services', to: '/categories', icon: Layers },
      { key: 'my-reports', label: 'My Reports', to: '/my-reports', icon: FileText },
    ];
    if (isAdmin) {
      base.push(
        { key: 'admin', label: 'Admin', to: '/admin', icon: Shield },
        { key: 'all-reports', label: 'All Reports', to: '/admin/reports', icon: ListChecks }
      );
    }
    return base;
  }, [isAdmin]);

  const linkBase = 'relative inline-flex items-center gap-1 px-3 h-9 rounded-md text-sm font-medium border-b-2 border-transparent transition-colors duration-200';

  return (
    <header
      className="sticky top-0 z-30 h-14 w-full bg-white/70 backdrop-blur-xl border-b border-gray-200/70 flex items-center gap-3 px-3 md:px-6 shadow-sm"
      role="banner"
    >
      {hasSidebar && (
        <motion.button
          aria-label="Open navigation menu"
          onClick={() => setOpen(true)}
          whileTap={{ scale: 0.9 }}
          className={`md:hidden inline-flex items-center justify-center h-10 w-10 rounded-md border border-gray-300/70 bg-white text-gray-700 hover:bg-gray-50 active:scale-95 transition ${open ? 'opacity-0 pointer-events-none' : ''}`}
        >
          <Menu size={20} />
        </motion.button>
      )}

      {/* Brand / Home */}
      <NavLink
        to="/"
        className="group flex items-center gap-2 font-semibold tracking-tight text-gray-800 hover:text-indigo-600 transition"
      >
        <img src={logo} alt="Logo" className="h-7 w-7 rounded-sm object-contain ring-1 ring-gray-200 group-hover:ring-indigo-300 transition" />
        <span className="hidden xs:inline-flex">Home</span>
      </NavLink>

      {/* Primary navigation (hidden on very small screens, rely on sidebar there) */}
      <nav className="hidden md:flex items-center gap-1 ml-2" aria-label="Primary">
        {navItems.map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.key}
              to={item.to}
              className={({ isActive }) =>
                `${linkBase} ${isActive
                  ? 'text-indigo-600 bg-indigo-50 border-indigo-500 font-semibold'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'} `
              }
            >
              <Icon size={15} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Right side auth & user actions */}
      <div className="ml-auto flex items-center gap-2">
        <SignedOut>
          <SignInButton mode="modal">
            <motion.button
              whileTap={{ scale: 0.92 }}
              whileHover={{ y: -2 }}
              className="inline-flex items-center gap-1 text-sm font-medium px-4 h-9 rounded-md bg-indigo-600 text-white hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 active:scale-95 transition"
            >
              Sign In
            </motion.button>
          </SignInButton>
        </SignedOut>
        <SignedIn>
          <div className="hidden sm:flex items-center gap-2">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.92 }}>
              <UserButton appearance={{ elements: { avatarBox: 'h-9 w-9' } }} afterSignOutUrl="/" />
            </motion.div>
            <SignOutButton className="bg-gray-200/70 text-gray-700 hover:bg-gray-300/80" />
          </div>
        </SignedIn>
      </div>
    </header>
  );
};

export default Navbar;
