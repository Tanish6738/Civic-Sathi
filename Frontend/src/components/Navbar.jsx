import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Menu, ChevronDown, FileText, Layers, Shield, ListChecks, PlusCircle, Users, History, Building2, User as UserIcon, SunMedium, MoonStar } from 'lucide-react';
import Bell from './Notifications/Bell';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';
import SignOutButton from './SignOutButton';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '../assets/logo.png';
import { useTheme } from '../contexts/ThemeContext';
import { useDbUser } from '../contexts/UserContext';

// Professional, minimal & responsive top navigation bar
const Navbar = ({ open, setOpen, isAdmin }) => {
  const hasSidebar = typeof setOpen === 'function';
  const { theme, toggleTheme } = useTheme();
  // Removed GSAP entrance animation to prevent inline transform/opacity styles from being injected

  const { dbUser } = useDbUser();
  const isOfficer = dbUser?.role === 'officer';

  // Central nav configuration (only key, label, to, icon)
  const location = useLocation();

  // Grouped navigation model
  const groups = useMemo(() => {
    const g = [
      {
        key: 'reports',
        label: 'Reports',
        items: [
          { key: 'new-report', label: 'New Report', to: '/report/new', icon: PlusCircle },
          { key: 'my-reports', label: 'My Reports', to: '/user/reports', icon: FileText },
        ]
      },
      ...(isOfficer ? [{
        key: 'officer',
        label: 'Officer',
        items: [
          { key: 'officer-dashboard', label: 'Dashboard', to: '/officer', icon: Shield },
          { key: 'officer-assignments', label: 'Assignments', to: '/officer/reports', icon: ListChecks },
          { key: 'officer-history', label: 'History', to: '/officer/history', icon: History },
        ]
      }] : []),
      {
        key: 'services',
        label: 'Services',
        items: [
          { key: 'services', label: 'Services', to: '/user/categories', icon: Layers },
          { key: 'departments', label: 'Departments', to: '/departments', icon: Building2 },
        ]
      },
      {
        key: 'account',
        label: 'Account',
        items: [
          { key: 'profile', label: 'Profile', to: '/user/profile', icon: UserIcon },
        ]
      }
    ];
    if (isAdmin && !isOfficer) {
      g.push({
        key: 'admin',
        label: 'Administration',
        items: [
          { key: 'admin', label: 'Dashboard', to: '/admin', icon: Shield },
          { key: 'users', label: 'Users', to: '/users', icon: Users },
          { key: 'all-reports', label: 'All Reports', to: '/admin/reports', icon: ListChecks },
          { key: 'audit', label: 'Audit Logs', to: '/audit-logs', icon: History }
        ]
      });
    }
    return g;
  }, [isAdmin, isOfficer]);

  const linkBase = 'relative inline-flex items-center gap-1 px-3 h-9 rounded-md text-sm font-medium border-b-2 border-transparent transition-colors duration-200 isolate';

  // Dropdown handling
  const [openGroup, setOpenGroup] = useState(null);
  const dropdownRefs = useRef({});

  const isPathActive = useCallback((paths) => paths.some(p => location.pathname === p || location.pathname.startsWith(p + '/')), [location.pathname]);

  useEffect(() => {
    function handleClick(e) {
      if (!openGroup) return;
      const ref = dropdownRefs.current[openGroup];
      if (ref && !ref.contains(e.target)) setOpenGroup(null);
    }
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [openGroup]);

  // Track scroll to reduce header transparency & add a subtle shadow depth
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const activeGroupKey = useMemo(() => {
    for (const g of groups) {
      if (isPathActive(g.items.map(i => i.to))) return g.key;
    }
    return null;
  }, [groups, isPathActive]);

  return (
    <header
      className={`sticky top-0 z-30 h-14 w-full border-b border-default flex items-center gap-3 px-3 md:px-6 transition-colors ${scrolled ? 'bg-surface shadow-sm' : 'bg-surface'}`}
      role="banner"
    >
  {hasSidebar && (
        <motion.button
          aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={open}
          onClick={() => setOpen(o => !o)}
          whileTap={{ scale: 0.9 }}
          className={`md:hidden inline-flex items-center justify-center h-10 w-10 rounded-md border border-default bg-surface text-soft hover:text-primary hover:bg-primary/10 active:scale-95 transition-colors`}
        >
          {open ? <span className="text-lg leading-none">×</span> : <Menu size={20} />}
        </motion.button>
      )}

      {/* Brand / Home */}
      <NavLink
        to="/"
  className="group flex items-center gap-2 font-semibold tracking-tight text-primary/90 dark:text-primary hover:text-primary transition-colors"
      >
  <img src={logo} alt="Logo" className="h-7 w-7 rounded-sm object-contain ring-1 ring-default group-hover:ring-primary transition" />
        <span className="hidden xs:inline-flex">Home</span>
      </NavLink>

      {/* Primary grouped navigation (desktop) */}
      <nav className="hidden md:flex items-center gap-2 ml-2 relative" aria-label="Primary">
        {/* Animated active highlight (moving pill) */}
        <AnimatePresence initial={false}>
          {activeGroupKey && (
            <motion.div
              key={activeGroupKey + '-highlight'}
              layoutId="nav-active-pill"
              className="absolute h-9 rounded-md bg-primary/15 border border-primary/30 shadow-sm"
              style={{ zIndex: 0 }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 220, damping: 22 }}
            />
          )}
        </AnimatePresence>
        {groups.map((group, idx) => {
          const active = activeGroupKey === group.key;
          const expanded = openGroup === group.key;
          return (
            <div
              key={group.key}
              className="relative" ref={el => (dropdownRefs.current[group.key] = el)}
              onMouseEnter={() => setOpenGroup(group.key)}
              onMouseLeave={() => setOpenGroup(prev => (prev === group.key ? null : prev))}
            >
              <motion.button
                type="button"
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => setOpenGroup(expanded ? null : group.key)}
                aria-haspopup="menu"
                aria-expanded={expanded}
                className={`${linkBase} ${active ? 'text-primary font-semibold' : 'text-soft hover:text-primary'} transition-colors`}
                style={{ zIndex: 1 }}
              >
                <span className="relative">
                  {group.label}
                  <motion.span
                    layoutId={`underline-${activeGroupKey === group.key ? 'active' : 'idle'}`}
                    className={`absolute left-0 right-0 -bottom-[2px] h-[2px] rounded-full ${active ? 'bg-primary' : 'bg-transparent'}`}
                    initial={false}
                    animate={{ backgroundColor: active ? 'rgba(var(--ds-primary),1)' : 'rgba(var(--ds-primary),0)' }}
                    transition={{ duration: 0.3 }}
                  />
                </span>
                <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
              </motion.button>
              <AnimatePresence>
                {expanded && (
                  <motion.div
                    key={group.key + '-menu'}
                    role="menu"
                    initial={{ opacity: 0, y: 4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                    className="absolute left-0 top-full mt-1 min-w-[13rem] rounded-lg border border-default bg-surface-80 shadow-lg p-1 flex flex-col backdrop-blur-xl overflow-hidden origin-top"
                  >
                    {group.items.map(item => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.key}
                          to={item.to}
                          className={({ isActive }) => `group/item relative flex items-center gap-2 px-3 h-9 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-primary text-white shadow-sm' : 'text-soft hover:bg-primary/10 hover:text-primary'}`}
                          role="menuitem"
                          onClick={() => setOpenGroup(null)}
                        >
                          <Icon size={15} className="shrink-0" />
                          <span className="flex-1">{item.label}</span>
                          <span className="opacity-0 group-hover/item:opacity-100 transition-opacity text-[10px] text-primary/70 tracking-wide">↗</span>
                        </NavLink>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      {/* Right side auth & user actions */}
      <div className="ml-auto flex items-center gap-2">
        {/* Theme toggle */}
        <motion.button
          whileTap={{ scale: 0.9, rotate: 8 }}
          whileHover={{ rotate: theme === 'dark' ? 8 : -8, scale: 1.05 }}
          onClick={toggleTheme}
          aria-label={`Activate ${theme === 'dark' ? 'light' : 'dark'} theme`}
          className="relative h-9 w-9 rounded-md border border-default bg-surface flex items-center justify-center text-soft hover:text-primary shadow-sm hover:bg-primary/10 transition-colors"
        >
          <motion.span
            key={theme}
            initial={{ scale: 0.4, opacity: 0, rotate: -20 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.4, opacity: 0, rotate: 20 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            {theme === 'dark' ? <SunMedium size={18} /> : <MoonStar size={18} />}
          </motion.span>
          <span className="sr-only">Toggle theme</span>
          <span className="pointer-events-none absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 text-white text-[10px] px-2 py-0.5 opacity-0 group-hover:opacity-100 transition md:hidden">Toggle theme</span>
        </motion.button>
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
            <Bell />
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
