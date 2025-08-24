import React, { useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
} from "@clerk/clerk-react";
import SignOutButton from "./SignOutButton";
import {
  Menu,
  X,
  ChevronLeft,
  ChevronDown,
  Layers,
  Shield,
  FileText,
  ListChecks,
  PlusCircle,
  Users,
  History,
  Building2,
  User as UserIcon,
} from "lucide-react";
import logo from "../assets/logo.png";
import { useTheme } from "../contexts/ThemeContext";

// Elegant, minimal, responsive sidebar
const SidebarTab = ({ open, setOpen, navItems, isLoaded, user, isAdmin }) => {
  const { theme } = useTheme();
  const baseItem =
    "group relative flex items-center gap-3 rounded-md h-10 px-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50 transition-colors";
  const accentBar =
    'before:content-[""] before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-1 before:rounded-full before:scale-y-0 group-[.active]:before:scale-y-100 before:transition-transform before:origin-top';
  const location = useLocation();

  // Derive grouped model from flat navItems for backwards compatibility
  const groups = useMemo(() => {
    const find = (path) => navItems.find((i) => i.to === path);
    const g = [
      {
        key: "reports",
        label: "Reports",
        icon: FileText,
        items: [
          find("/report/new"),
          find("/user/reports"),
          isAdmin ? find("/admin/reports") : null,
        ].filter(Boolean),
      },
      {
        key: "services",
        label: "Services",
        icon: Layers,
        items: [find("/user/categories"), find("/departments")].filter(Boolean),
      },
      {
        key: "account",
        label: "Account",
        icon: UserIcon,
        items: [find("/user/profile")].filter(Boolean),
      },
    ];
    if (isAdmin) {
      g.push({
        key: "admin",
        label: "Administration",
        icon: Shield,
        items: [find("/admin"), find("/users"), find("/audit-logs")].filter(
          Boolean
        ),
      });
    }
    return g.filter((gr) => gr.items.length);
  }, [navItems, isAdmin]);

  const pathIsActive = (paths) =>
    paths.some(
      (p) => location.pathname === p || location.pathname.startsWith(p + "/")
    );
  const initiallyOpen = groups.reduce((acc, g) => {
    acc[g.key] = pathIsActive(g.items.map((i) => i.to));
    return acc;
  }, {});
  const [openGroups, setOpenGroups] = useState(initiallyOpen);
  const toggleGroup = (key) => setOpenGroups((s) => ({ ...s, [key]: !s[key] }));

  return (
    <aside
      className={`group/sidebar fixed md:sticky md:top-0 top-0 left-0 h-full md:h-screen z-40 flex flex-col bg-surface border-r border-default shadow-elevate md:shadow-sm transition-[width,transform] duration-300 ease-in-out ${open ? "w-64 md:w-60 translate-x-0" : "w-0 md:w-16 -translate-x-full md:translate-x-0"} overflow-hidden`}
      aria-label="Sidebar navigation"
    >
      {/* Header / Brand */}
      <div className="flex items-center h-14 px-3 border-b border-default bg-surface">
        {open ? (
          <>
            <NavLink
              to="/"
              className="flex items-center gap-2 font-semibold tracking-tight text-primary/90 dark:text-primary hover:text-primary transition-colors min-w-0"
            >
              <img
                src={logo}
                alt="Logo"
                className="h-7 w-7 rounded-sm object-contain ring-1 ring-default hover:ring-primary transition"
              />
              <span className="truncate">Nigam AI</span>
            </NavLink>
            <div className="ml-auto flex items-center gap-1">
              <button
                aria-label="Collapse sidebar"
                onClick={() => setOpen(false)}
                className="hidden md:inline-flex items-center justify-center h-9 w-9 rounded-md text-soft hover:text-primary hover:bg-primary/10 active:scale-95 transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                aria-label="Close sidebar"
                onClick={() => setOpen(false)}
                className="md:hidden inline-flex items-center justify-center h-9 w-9 rounded-md text-soft hover:text-primary hover:bg-primary/10 active:scale-95 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </>
        ) : (
          <button
            aria-label="Expand sidebar"
            onClick={() => setOpen(true)}
            className="w-full flex items-center justify-center h-10 rounded-md text-soft hover:text-primary hover:bg-primary/10 active:scale-95 transition-colors"
          >
            <Menu size={20} />
          </button>
        )}
      </div>

      {/* Navigation (grouped) */}
      <nav
        className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300/60 dark:scrollbar-thumb-gray-600/60 scrollbar-track-transparent py-4 px-2"
        aria-label="Primary"
      >
        <ul className="flex flex-col gap-2">
          {groups.map((group) => {
            const GroupIcon = group.icon;
            const groupActive = pathIsActive(group.items.map((i) => i.to));
            const expanded = openGroups[group.key];
            return (
              <li key={group.key} className="relative">
                <button
                  onClick={() => toggleGroup(group.key)}
                  className={`w-full ${baseItem} ${groupActive ? "active bg-primary/15 text-primary font-semibold" : "text-soft hover:text-primary hover:bg-primary/10"} ${!open ? "justify-center px-0 w-11 mx-auto" : ""} transition-colors`}
                  aria-expanded={expanded}
                  aria-controls={`group-${group.key}`}
                  aria-label={!open ? group.label : undefined}
                >
                  <span
                    className={`inline-flex items-center justify-center shrink-0 h-7 w-7 rounded-md transition-colors ${open ? "bg-primary/15 text-primary group-hover:bg-primary/20" : "text-primary/80"} ${groupActive ? "bg-primary text-white" : ""}`}
                  >
                    <GroupIcon size={16} />
                  </span>
                  {open && (
                    <span className="truncate flex-1 text-left">
                      {group.label}
                    </span>
                  )}
                  {open && (
                    <ChevronDown
                      size={14}
                      className={`transition-transform ${expanded ? "rotate-180" : ""}`}
                    />
                  )}
                  {!open && (
                    <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2 py-1 rounded-md bg-gray-900 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg">
                      {group.label}
                    </span>
                  )}
                </button>
                {expanded && open && (
                  <ul
                    id={`group-${group.key}`}
                    className="mt-1 ml-2 flex flex-col gap-1 border-l border-default pl-2"
                  >
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <li key={item.to} className="relative">
                          <NavLink
                            to={item.to}
                            onClick={() => !open && setOpen(true)}
                            className={({ isActive }) =>
                              `${baseItem} h-9 pl-2 pr-2 ${accentBar} ${isActive ? "active bg-primary/20 text-primary font-semibold before:bg-primary" : "text-soft hover:text-primary hover:bg-primary/10 before:bg-primary/60"} transition-colors`
                            }
                          >
                            <span
                              className={`inline-flex items-center justify-center shrink-0 h-6 w-6 rounded-md text-primary ${open ? "bg-transparent" : ""}`}
                            >
                              <Icon size={14} />
                            </span>
                            {open && (
                              <span className="truncate">{item.label}</span>
                            )}
                          </NavLink>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer / User section */}
      <div className="border-t border-default p-3 flex items-center gap-3 bg-surface">
        <div className="flex-1 min-w-0">
          {isLoaded && user && open && (
            <p className="text-xs font-medium text-soft leading-tight truncate">
              {user.fullName || user.username || "User"}
            </p>
          )}
          {open && (
            <p className="text-[10px] text-soft/70 mt-0.5">
              © {new Date().getFullYear()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <SignedOut>
            <SignInButton mode="modal" />
          </SignedOut>
          <SignedIn>
            <UserButton
              appearance={{ elements: { avatarBox: "h-8 w-8" } }}
              afterSignOutUrl="/"
            />
            {open && (
              <SignOutButton className="bg-primary/10 text-primary hover:bg-primary/15" />
            )}
          </SignedIn>
        </div>
      </div>
    </aside>
  );
};

export default SidebarTab;
