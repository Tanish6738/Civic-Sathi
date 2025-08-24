import React, { useState, useMemo, useEffect, useRef } from "react";
import { NavLink } from 'react-router-dom';
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from '@clerk/clerk-react';
import adminEmails from '../../data/data.json';
import SignOutButton from "../SignOutButton";
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Menu, X } from 'lucide-react';
import logo from '../../assets/logo.png';
gsap.registerPlugin(ScrollTrigger);
// Central nav list (user scope)
const BASE_LINKS = [
  { to: '/user/categories', label: 'Services' },
  // Route adjusted to match App.routes.jsx which defines '/report/new'
  { to: '/report/new', label: 'Report' },
  { to: '/user/reports', label: 'My Reports' },
  { to: '/user/profile', label: 'Profile' },
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

  const headerRef = useRef(null);
  const logoRef = useRef(null);
  const linksRef = useRef([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out', duration: 0.6 } });
      tl.from(headerRef.current, { y: -40, opacity: 0 });
      tl.from(logoRef.current, { y: 20, opacity: 0 }, '-=0.3');
      tl.from(linksRef.current, { y: 16, opacity: 0, stagger: 0.07 }, '-=0.35');
    });
    return () => ctx.revert();
  }, []);

  // Close on outside click & Esc, lock scroll when open
  useEffect(() => {
    function onKey(e){ if(e.key === 'Escape') setMenuOpen(false); }
    function onClick(e){
      if(!menuOpen) return;
      const header = headerRef.current;
      if(header && !header.contains(e.target)) setMenuOpen(false);
    }
    if(menuOpen){
      document.addEventListener('keydown', onKey);
      document.addEventListener('mousedown', onClick);
      // lock scroll (simple approach)
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  return (
    <header
      ref={headerRef}
      className={`group sticky top-2 z-50 flex justify-between items-center px-4 sm:px-6 py-3 mx-auto w-[90%] max-w-7xl rounded-2xl bg-white/10 backdrop-blur-2xl saturate-150 shadow-[0_8px_30px_-4px_rgba(0,0,0,0.25)] border border-white/25 ring-1 ring-white/30 gap-4 transition-colors duration-300 supports-[backdrop-filter]:bg-white/10 ${menuOpen ? 'overflow-visible' : 'overflow-hidden'}`}
    >
      {/* subtle sheen */}
      <span className="pointer-events-none absolute inset-0 before:absolute before:inset-0 before:bg-[linear-gradient(135deg,rgba(255,255,255,0.25)_0%,rgba(255,255,255,0.05)_35%,rgba(255,255,255,0)_60%)] opacity-60 mix-blend-overlay" />
      <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
        <img src={logo} alt="Logo" className="h-9 w-9 rounded-md object-contain ring-1 ring-black/5" />
        <motion.h1
          ref={logoRef}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          className="text-2xl font-extrabold tracking-tight text-purple-700 "
        >
          Nigam Ai
        </motion.h1>
      </div>

      {/* Desktop nav links */}
      <nav className="hidden md:flex items-center gap-1 text-sm font-medium" aria-label="Primary">
        {links.map((l, i) => (
          <motion.div
            key={l.to}
            ref={el => (linksRef.current[i] = el)}
            whileHover={{ y: -2 }}
            className="relative"
          >
            <NavLink
              to={l.to}
              className={({ isActive }) => `px-3 py-2 rounded-md transition-colors duration-300 inline-flex items-center gap-1 ${isActive ? 'bg-blue-600 text-white shadow-sm' : 'text-purple-500 underline- hover:text-white hover:bg-black/50'}`}
            >
              {l.label}
            </NavLink>
            <motion.span
              layoutId="nav-underline"
              className="absolute left-1/2 -translate-x-1/2 -bottom-1 h-0.5 w-0 bg-gradient-to-r from-blue-600 to-orange-500 rounded-full"
              initial={false}
              animate={{ width: 0 }}
            />
          </motion.div>
        ))}
      </nav>

      {/* Right side auth */}
      <div className="hidden md:flex items-center gap-3">
        <SignedOut>
          <SignInButton mode="modal">
            <motion.button whileTap={{ scale: .95 }} whileHover={{ y: -2 }} className="px-4 py-1.5 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 shadow-sm transition">
              Sign In
            </motion.button>
          </SignInButton>
        </SignedOut>
        <SignedIn>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: .94 }}>
            <UserButton appearance={{ elements: { avatarBox: 'h-9 w-9' } }} afterSignOutUrl="/" />
          </motion.div>
          <SignOutButton className="h-9 text-xs hover:bg-blue-500 " />
        </SignedIn>
      </div>

      {/* Mobile menu toggle */}
      <motion.button
        aria-label={menuOpen ? "Close menu" : "Open menu"}
        aria-expanded={menuOpen}
        aria-controls="mobile-menu"
        onClick={() => setMenuOpen(o => !o)}
        whileTap={{ scale: .9 }}
        className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 active:scale-95 transition relative overflow-hidden"
      >
        <span className="sr-only">Menu</span>
        <AnimatePresence initial={false} mode="wait">
          {menuOpen ? (
            <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} className="flex"><X size={22} /></motion.span>
          ) : (
            <motion.span key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} className="flex"><Menu size={22} /></motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Mobile dropdown */}
      <AnimatePresence>
    {menuOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: .28, ease: 'easeOut' }}
      id="mobile-menu"
      className="md:hidden absolute top-full left-0 w-full bg-white backdrop-blur-2xl saturate-150 rounded-md border-white/20 origin-top z-50 rounded-b-2xl"
          >
            <div className="flex flex-col p-4 gap-2">
              {links.map((l, i) => (
                <motion.div key={l.to} initial={{ x: -12, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.04 * i }}>
                  <NavLink
                    to={l.to}
                    onClick={closeMenu}
                    className={({ isActive }) => `w-full text-left px-4 py-2 rounded-lg text-sm font-medium tracking-tight transition ${isActive ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-700 hover:bg-white/40 hover:text-gray-900'}`}
                  >
                    {l.label}
                  </NavLink>
                </motion.div>
              ))}
              <div className="pt-2 border-t border-white/20 mt-1 flex items-center gap-3">
                <SignedOut>
                  <SignInButton mode="modal">
                    <motion.button whileTap={{ scale: .96 }} onClick={closeMenu} className="w-full px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60">
                      Sign In
                    </motion.button>
                  </SignInButton>
                </SignedOut>
                <SignedIn>
                  <div className="flex items-center gap-3 w-full justify-between">
                    <UserButton appearance={{ elements: { avatarBox: 'h-10 w-10' } }} afterSignOutUrl="/" />
                    <SignOutButton className="flex-1 justify-center h-10 text-xs hover:bg-orange-500/10" />
                  </div>
                </SignedIn>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
