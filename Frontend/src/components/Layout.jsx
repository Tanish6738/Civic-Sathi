import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import {
  Users,
  BarChart3,
  User,
  FileText,
  Shield,
  ListChecks,
  Layers,
  History,
  Building2,
} from "lucide-react";
import adminEmails from "../data/data.json";
import SidebarTab from "./SidebarTab";
import Navbar from "./Navbar";
import PhoneModal from "./User/PhoneModal";
import { useDbUser } from "../contexts/UserContext";
import { getUserById } from "../services/user.services";
import { Footer } from "./landing";

class ErrorBoundary extends React.Component {
  constructor(props){ super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError(){ return { hasError: true }; }
  componentDidCatch(err, info){ console.error('UI ErrorBoundary', err, info); }
  render(){ if (this.state.hasError) return <div className="p-6 text-sm text-danger">Something went wrong.</div>; return this.props.children; }
}

// Base (non-admin) navigation items
const NAV = [
  { to: "/report/new", label: "New Report", icon: BarChart3 },
  { to: "/user/categories", label: "Services", icon: Layers },
  { to: "/departments", label: "Departments", icon: Building2 },
  { to: "/user/reports", label: "My Reports", icon: FileText },
  { to: "/user/profile", label: "Profile", icon: User },
];

const Layout = ({ children }) => {
  const [open, setOpen] = useState(() => {
    // Start closed on small screens for better mobile UX
    if (typeof window !== "undefined" && window.innerWidth < 768) return false;
    return true;
  });
  const { isLoaded, user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const isAdmin =
    !!email && Array.isArray(adminEmails) && adminEmails.includes(email);
  // Access backend role for officer-specific menu
  const { dbUser, setDbUser } = useDbUser ? useDbUser() : { dbUser: null, setDbUser: () => {} };
  const isOfficer = dbUser?.role === 'officer';
  const navItems = isOfficer
    ? [
        { to: "/officer", label: "Officer", icon: Shield },
        { to: "/officer/reports", label: "Assignments", icon: ListChecks },
        { to: "/officer/history", label: "History", icon: History },
        ...NAV,
      ]
    : (isAdmin ? [
        ...NAV,
        { to: "/users", label: "Users", icon: Users },
        { to: "/admin", label: "Admin", icon: Shield },
        { to: "/admin/reports", label: "All Reports", icon: ListChecks },
        { to: "/audit-logs", label: "Audit Logs", icon: History },
      ] : NAV);

  // Persist sidebar state between reloads
  useEffect(() => {
    const stored = localStorage.getItem("sidebar-open");
    if (stored !== null) setOpen(stored === "true");
  }, []);
  useEffect(() => {
    localStorage.setItem("sidebar-open", String(open));
  }, [open]);

  // Access backend user (dbUser) from context if provided by parent; if not present, attempt fetch by clerkId.
  // dbUser already destructured above
  const needsPhone =
    !!user && (!dbUser || !dbUser.phone || !/^[0-9]{10}$/.test(dbUser.phone));

  useEffect(() => {
    let cancelled = false;
    async function ensureDbUser() {
      if (!user) return;
      if (dbUser && dbUser.phone) return; // already have
      // Try fetch using clerkId (falls back on server logic)
      try {
        const fetched = await getUserById(user.id);
        if (!cancelled && fetched) setDbUser && setDbUser(fetched);
      } catch (_) {}
    }
    ensureDbUser();
    return () => {
      cancelled = true;
    };
  }, [user, dbUser, setDbUser]);

  return (
    <>
      <div
        className={`min-h-screen w-full flex bg-app text-soft transition-colors duration-300 ${needsPhone ? "overflow-hidden" : ""}`}
      >
        <SidebarTab
          open={open}
          setOpen={setOpen}
          navItems={navItems}
          isLoaded={isLoaded}
          user={user}
          isAdmin={isAdmin}
        />
        <div className="flex-1 flex flex-col min-h-screen md:pl-0 relative">
          <Navbar open={open} setOpen={setOpen} isAdmin={isAdmin} />
          <main className={`flex-1 p-4 md:p-6 ${needsPhone ? "pointer-events-none select-none blur-sm" : ""}`}>
            <ErrorBoundary>{children}</ErrorBoundary>
          </main>
          {needsPhone && dbUser && (
            <PhoneModal
              userId={dbUser._id || dbUser.id || dbUser.clerkId}
              onSaved={(phone) => {
                setDbUser && setDbUser({ ...dbUser, phone });
              }}
            />
          )}
        </div>
      </div>

      <Footer />
    </>
  );
};

export default Layout;
