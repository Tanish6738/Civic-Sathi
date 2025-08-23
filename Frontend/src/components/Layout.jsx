import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Users, BarChart3, User, FileText, Shield, ListChecks } from 'lucide-react';
import adminEmails from '../data/data.json';
import SidebarTab from './SidebarTab';
import Navbar from './Navbar';

// Central nav config
const NAV = [
  { to: '/users', label: 'Users', icon: Users },
  { to: '/report', label: 'Report', icon: BarChart3 },
  { to: '/my-reports', label: 'My Reports', icon: FileText },
  { to: '/profile', label: 'Profile', icon: User },
];

const Layout = ({ children }) => {
  const [open, setOpen] = useState(true);
  const { isLoaded, user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const isAdmin = !!email && Array.isArray(adminEmails) && adminEmails.includes(email);
  const navItems = isAdmin ? [...NAV, { to: '/admin', label: 'Admin', icon: Shield }, { to: '/admin/reports', label: 'All Reports', icon: ListChecks }] : NAV;

  // Persist sidebar state between reloads
  useEffect(()=>{
    const stored = localStorage.getItem('sidebar-open');
    if(stored !== null) setOpen(stored === 'true');
  },[]);
  useEffect(()=>{ localStorage.setItem('sidebar-open', String(open)); },[open]);

  return (
    <div className="min-h-screen w-full flex bg-gradient-to-br from-gray-100 via-gray-100 to-gray-200 text-gray-900">
      <SidebarTab open={open} setOpen={setOpen} navItems={navItems} isLoaded={isLoaded} user={user} />
      <div className="flex-1 flex flex-col min-h-screen md:pl-0">
        <Navbar open={open} setOpen={setOpen} isAdmin={isAdmin} />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
};

export default Layout;