import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useUser, SignedOut } from "@clerk/clerk-react";
import adminEmails from "../data/data.json";
import Profile from "../components/User/Profile";
import Landing from "../components/Basic/landing";
import UsersHome from "../components/User/UsersHome";
import Report from "../components/User/Report";
import CreateReport from "../components/User/CreateReport";
import CategoryFormPage from "../components/CategoryFroms/CategoryFormPage";
import { Routes, Route } from "react-router-dom";
import { syncUser as syncUserService } from "../services/user.services";
import AdminDashBoard from "../components/Admin/AdminDashBoard";
import AllReports from "../components/Admin/Reports/AllReports";
import MyReports from "../components/User/profile/MyReports";
import Layout from "../components/Layout";
import AuditLogList from "../components/Admin/AuditLogList";
import ReactLazy from 'react';
const OfficerDashboard = React.lazy(()=> import('../components/Officier/OfficerDashboard'));
const OfficerReportsList = React.lazy(()=> import('../components/Officier/OfficerReportsList'));
const OfficerReportHistory = React.lazy(()=> import('../components/Officier/OfficerReportHistory'));
import DepartmentsHome from "../components/User/DepartmentsHome";
import DepartmentDetail from "../components/User/DepartmentDetail";
import { UserProvider } from "../contexts/UserContext";
import ImageUpload from "../components/ImageUpload";

const RequireAdmin = ({ children }) => {
  const { isLoaded, user } = useUser();
  if (!isLoaded) return null; // could render a spinner
  const email = user?.primaryEmailAddress?.emailAddress;
  const isAdmin =
    !!email && Array.isArray(adminEmails) && adminEmails.includes(email);
  return isAdmin ? children : <Navigate to="/" replace />;
};

// Officer-only guard: must have backend role=officer (admins explicitly blocked)
const RequireOfficer = ({ children, dbUser }) => {
  if (!dbUser) return null;
  if (dbUser.role !== 'officer') return <Navigate to="/" replace />;
  return children;
};

// Generic protection: any non-root route requires sign-in. Falls back to landing page.
const ProtectedRoute = ({ children }) => {
  const { isLoaded, isSignedIn } = useUser();
  if (!isLoaded) return null; // optionally a loader/spinner
  return isSignedIn ? children : <Navigate to="/" replace />;
};

// Landing page rendered standalone (outside Layout). All other pages wrapped in Layout.
const withLayout = (el) => <Layout>{el}</Layout>;

const AppRoutes = () => {
  const { isLoaded, isSignedIn, user } = useUser();
  const [dbUser, setDbUser] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function doSync() {
      if (!isLoaded || !isSignedIn || !user) return;
      setSyncError(null);
      setSyncing(true);
      try {
        const res = await syncUserService(user);
        if (!cancelled) setDbUser(res);
      } catch (err) {
        console.error("User sync failed", err);
        if (!cancelled) setSyncError("Failed to sync user profile");
        // Optional: integrate a toast notification system here
      } finally {
        if (!cancelled) setSyncing(false);
      }
    }
    doSync();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, user]);

  return (
    <UserProvider initialUser={dbUser}>
      <Routes>
        {/* Officer exclusive routes (admins NOT allowed) */}
        <Route
          path="/image-upload"
          element={withLayout(<ImageUpload />)}
        />
        <Route
          path="/officer"
          element={<ProtectedRoute>{withLayout(<React.Suspense fallback={<div className='p-6 text-sm text-soft/60'>Loading officer dashboard...</div>}><RequireOfficer dbUser={dbUser}><OfficerDashboard /></RequireOfficer></React.Suspense>)}</ProtectedRoute>}
        />
        <Route
          path="/officer/reports"
          element={<ProtectedRoute>{withLayout(<React.Suspense fallback={<div className='p-6 text-sm text-soft/60'>Loading assignments...</div>}><RequireOfficer dbUser={dbUser}><OfficerReportsList /></RequireOfficer></React.Suspense>)}</ProtectedRoute>}
        />
        <Route
          path="/officer/history"
          element={<ProtectedRoute>{withLayout(<React.Suspense fallback={<div className='p-6 text-sm text-soft/60'>Loading history...</div>}><RequireOfficer dbUser={dbUser}><OfficerReportHistory /></RequireOfficer></React.Suspense>)}</ProtectedRoute>}
        />
        <Route path="/" element={<Landing />} />
        <Route
          path="/user/profile"
          element={<ProtectedRoute>{withLayout(<Profile />)}</ProtectedRoute>}
        />
        <Route
          path="/user/reports"
          element={<ProtectedRoute>{withLayout(<MyReports />)}</ProtectedRoute>}
        />
        <Route
          path="/user/reports/:id"
          element={<ProtectedRoute>{withLayout(<Report />)}</ProtectedRoute>}
        />
        <Route
          path="/report/new"
          element={<ProtectedRoute>{withLayout(<CreateReport />)}</ProtectedRoute>}
        />
        <Route
          path="/user/categories"
          element={<ProtectedRoute>{withLayout(<CategoryFormPage />)}</ProtectedRoute>}
        />
        <Route
          path="/departments"
          element={<ProtectedRoute>{withLayout(<DepartmentsHome />)}</ProtectedRoute>}
        />
        <Route
          path="/departments/:id"
          element={<ProtectedRoute>{withLayout(<DepartmentDetail />)}</ProtectedRoute>}
        />
        <Route
          path="/users"
          element={<ProtectedRoute>{withLayout(<UsersHome />)}</ProtectedRoute>}
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              {withLayout(
                <RequireAdmin>
                  <AdminDashBoard />
                </RequireAdmin>
              )}
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <ProtectedRoute>
              {withLayout(
                <RequireAdmin>
                  <AllReports />
                </RequireAdmin>
              )}
            </ProtectedRoute>
          }
        />
        <Route
          path="/audit-logs"
          element={
            <ProtectedRoute>
              {withLayout(
                <RequireAdmin>
                  <AuditLogList />
                </RequireAdmin>
              )}
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <SignedOut>
        {/* Could show a public landing or redirect. Already have / route. */}
      </SignedOut>
      {syncing && (
        <div
          style={{
            position: "fixed",
            bottom: 8,
            right: 8,
            background: "#222",
            color: "#fff",
            padding: "6px 10px",
            borderRadius: 4,
            fontSize: 12,
          }}
        >
          Syncing profile...
        </div>
      )}
      {syncError && (
        <div
          style={{
            position: "fixed",
            bottom: 8,
            right: 8,
            background: "#b00020",
            color: "#fff",
            padding: "6px 10px",
            borderRadius: 4,
            fontSize: 12,
          }}
        >
          {syncError}
        </div>
      )}
    </UserProvider>
  );
};

export default AppRoutes;
