import React from 'react';
import { NavLink } from 'react-router-dom';
import { Menu, Home, FileText } from 'lucide-react';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';
import SignOutButton from './SignOutButton';

// Top navigation bar
const Navbar = ({ open, setOpen, isAdmin }) => {
  return (
    <header className="sticky top-0 z-30 h-14 w-full bg-white/70 backdrop-blur border-b border-gray-200 flex items-center gap-3 px-4 md:px-6">
      <button
        aria-label="Open sidebar"
        onClick={()=>setOpen(true)}
        className={`md:hidden inline-flex items-center justify-center h-10 w-10 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 active:scale-95 transition ${open ? 'opacity-0 pointer-events-none' : ''}`}
      >
        <Menu size={20} />
      </button>
      <NavLink to="/" className="flex items-center gap-2 font-semibold tracking-tight text-gray-800">
        <Home size={18} /> <span>Home</span>
      </NavLink>
      <div className="flex items-center gap-2 ml-auto">
        <NavLink to="/my-reports" className={({isActive})=>`hidden sm:inline-flex items-center gap-1 text-sm font-medium px-3 h-9 rounded-md ${isActive? 'bg-indigo-600 text-white':'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}>
          <FileText size={14}/> My Reports
        </NavLink>
        {isAdmin && (
          <>
            <NavLink to="/admin" className={({isActive})=>`hidden sm:inline-flex items-center gap-1 text-sm font-medium px-3 h-9 rounded-md ${isActive? 'bg-gray-900 text-white':'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}>Admin</NavLink>
            <NavLink to="/admin/reports" className={({isActive})=>`hidden lg:inline-flex items-center gap-1 text-sm font-medium px-3 h-9 rounded-md ${isActive? 'bg-indigo-600 text-white':'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}>All Reports</NavLink>
          </>
        )}
        {/* Auth actions */}
        <SignedOut>
          <SignInButton mode="modal">
            <button className="inline-flex items-center gap-1 text-sm font-medium px-3 h-9 rounded-md bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95 transition">
              Sign In
            </button>
          </SignInButton>
        </SignedOut>
        <SignedIn>
          <div className="hidden sm:flex items-center gap-2">
            <UserButton appearance={{ elements: { avatarBox: 'h-9 w-9' } }} afterSignOutUrl="/" />
            <SignOutButton className="bg-gray-200 text-gray-700 hover:bg-gray-300" />
          </div>
        </SignedIn>
      </div>
    </header>
  );
};

export default Navbar;
