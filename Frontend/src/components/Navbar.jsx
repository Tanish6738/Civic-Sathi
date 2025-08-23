import React from 'react';
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from '@clerk/clerk-react';
import { Menu, X, Home, FileText } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import adminEmails from '../data/data.json';

const Navbar = ({ open, setOpen }) => {
  const { isLoaded, user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const isAdmin = !!email && Array.isArray(adminEmails) && adminEmails.includes(email);
  return (
    <header className="w-full flex items-center justify-between gap-4 px-4 h-14 bg-white/80 backdrop-blur border-b border-gray-200 sticky top-0 z-30 md:pl-6">
      <div className="flex items-center gap-3">
        <button
          aria-label="Toggle sidebar"
          onClick={() => setOpen(o => !o)}
          className="md:hidden inline-flex items-center justify-center h-10 w-10 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 active:scale-95 transition"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
        <NavLink to="/" end className="flex items-center gap-2 font-semibold tracking-tight text-gray-800 hover:text-gray-900">
          <Home size={18} />
          <span className="hidden xs:inline">Home</span>
        </NavLink>
        <span className="font-semibold tracking-tight text-gray-800 hidden sm:inline">Nigam Ai</span>
        <NavLink to="/my-reports" className={({isActive})=>`hidden sm:inline-flex items-center gap-1 text-sm font-medium ml-2 px-2 py-1 rounded ${isActive? 'bg-indigo-600 text-white':'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}>
          <FileText size={14} /> My Reports
        </NavLink>
        {isAdmin && (
          <NavLink to="/admin" className={({isActive})=>`hidden sm:inline text-sm font-medium ml-1 px-2 py-1 rounded ${isActive? 'bg-gray-900 text-white':'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}>Admin</NavLink>
        )}
      </div>
      <div className="flex items-center gap-3">
        <SignedOut>
          <SignInButton mode="modal" />
        </SignedOut>
        <SignedIn>
          <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: 'w-9 h-9' } }} />
        </SignedIn>
      </div>
    </header>
  );
};

export default Navbar;