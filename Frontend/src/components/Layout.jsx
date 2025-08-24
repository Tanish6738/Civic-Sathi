import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Users, BarChart3, User, FileText, Shield, ListChecks, Layers, History, Building2 } from 'lucide-react';
import adminEmails from '../data/data.json';
import SidebarTab from './SidebarTab';
import Navbar from './Navbar';
import PhoneModal from './User/PhoneModal';
import { useDbUser } from '../contexts/UserContext';
import { getUserById } from '../services/user.services';

// Base (non-admin) navigation items
const NAV = [
  { to: '/report/new', label: 'New Report', icon: BarChart3 },
  { to: '/user/categories', label: 'Services', icon: Layers },
  { to: '/departments', label: 'Departments', icon: Building2 },
  { to: '/user/reports', label: 'My Reports', icon: FileText },
  { to: '/user/profile', label: 'Profile', icon: User },
];

const Layout = ({ children }) => {
  const [open, setOpen] = useState(() => {
    // Start closed on small screens for better mobile UX
    if (typeof window !== 'undefined' && window.innerWidth < 768) return false;
    return true;
  });
  const { isLoaded, user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const isAdmin = !!email && Array.isArray(adminEmails) && adminEmails.includes(email);
  const navItems = isAdmin
    ? [
        ...NAV,
        { to: '/users', label: 'Users', icon: Users },
        { to: '/admin', label: 'Admin', icon: Shield },
        { to: '/admin/reports', label: 'All Reports', icon: ListChecks },
        { to: '/audit-logs', label: 'Audit Logs', icon: History }
      ]
    : NAV;

  // Persist sidebar state between reloads
  useEffect(()=>{
    const stored = localStorage.getItem('sidebar-open');
    if(stored !== null) setOpen(stored === 'true');
  },[]);
  useEffect(()=>{ localStorage.setItem('sidebar-open', String(open)); },[open]);

  // Access backend user (dbUser) from context if provided by parent; if not present, attempt fetch by clerkId.
  const { dbUser, setDbUser } = useDbUser ? useDbUser() : { dbUser: null, setDbUser: ()=>{} };
  const needsPhone = !!user && (!dbUser || !dbUser.phone || !/^[0-9]{10}$/.test(dbUser.phone));

  useEffect(()=>{
    let cancelled=false;
    async function ensureDbUser(){
      if(!user) return;
      if(dbUser && dbUser.phone) return; // already have
      // Try fetch using clerkId (falls back on server logic)
      try { const fetched = await getUserById(user.id); if(!cancelled && fetched) setDbUser && setDbUser(fetched); } catch(_){}
    }
    ensureDbUser();
    return ()=>{ cancelled=true; };
  },[user, dbUser, setDbUser]);

  return (
    <div className={`min-h-screen w-full flex bg-gradient-to-br from-gray-100 via-gray-100 to-gray-200 text-gray-900 ${needsPhone ? 'overflow-hidden' : ''}`}>
  <SidebarTab open={open} setOpen={setOpen} navItems={navItems} isLoaded={isLoaded} user={user} isAdmin={isAdmin} />
      <div className="flex-1 flex flex-col min-h-screen md:pl-0 relative">
        <Navbar open={open} setOpen={setOpen} isAdmin={isAdmin} />
        <main className={`flex-1 p-4 md:p-6 ${needsPhone ? 'pointer-events-none select-none blur-sm' : ''}`}>{children}</main>
        {needsPhone && dbUser && (
          <PhoneModal userId={dbUser._id || dbUser.id || dbUser.clerkId} onSaved={(phone)=>{ setDbUser && setDbUser({ ...dbUser, phone }); }} />
        )}
      </div>
    </div>
  );
};

export default Layout;