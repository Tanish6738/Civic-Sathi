import React, { createContext, useContext, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useUser, SignedIn, SignedOut } from '@clerk/clerk-react';
import adminEmails from '../data/data.json';
import Profile from '../components/User/Profile';
import Landing from '../components/Basic/landing';
import UsersHome from '../components/User/UsersHome';
import Report from '../components/User/Report';
import CategoryFormPage from '../components/CategoryFroms/CategoryFormPage';
import { Routes, Route } from 'react-router-dom';
import { syncUser as syncUserService } from '../services/user.services';
import AdminDashBoard from '../components/Admin/AdminDashBoard';
import AllReports from '../components/Admin/Reports/AllReports';
import MyReports from '../components/User/profile/MyReports';
import Layout from '../components/Layout';

const RequireAdmin = ({ children }) => {
  const { isLoaded, user } = useUser();
  if (!isLoaded) return null; // could render a spinner
  const email = user?.primaryEmailAddress?.emailAddress;
  const isAdmin = !!email && Array.isArray(adminEmails) && adminEmails.includes(email);
  return isAdmin ? children : <Navigate to="/" replace />;
};

// Landing page rendered standalone (outside Layout). All other pages wrapped in Layout.
const withLayout = (el) => <Layout>{el}</Layout>;

// UserContext to store synced DB user
const UserContext = createContext({ dbUser: null, setDbUser: () => {} });
export const useDbUser = () => useContext(UserContext);

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
        console.error('User sync failed', err);
        if (!cancelled) setSyncError('Failed to sync user profile');
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
    <UserContext.Provider value={{ dbUser, setDbUser, syncing }}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/users"
          element={<SignedIn>{withLayout(<UsersHome />)}</SignedIn>}
        />
        <Route
          path="/report"
          element={<SignedIn>{withLayout(<Report />)}</SignedIn>}
        />
        <Route
          path="/my-reports"
          element={<SignedIn>{withLayout(<MyReports />)}</SignedIn>}
        />
        <Route
          path="/categories"
          element={<SignedIn>{withLayout(<CategoryFormPage />)}</SignedIn>}
        />
        <Route
          path="/profile"
          element={<SignedIn>{withLayout(<Profile />)}</SignedIn>}
        />
        <Route
          path="/admin"
          element={<SignedIn>{withLayout(<RequireAdmin><AdminDashBoard /></RequireAdmin>)}</SignedIn>}
        />
        <Route
          path="/admin/reports"
          element={<SignedIn>{withLayout(<RequireAdmin><AllReports /></RequireAdmin>)}</SignedIn>}
        />
        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Routes>
      <SignedOut>
        {/* Could show a public landing or redirect. Already have / route. */}
      </SignedOut>
      {syncing && <div style={{ position: 'fixed', bottom: 8, right: 8, background: '#222', color: '#fff', padding: '6px 10px', borderRadius: 4, fontSize: 12 }}>Syncing profile...</div>}
      {syncError && <div style={{ position: 'fixed', bottom: 8, right: 8, background: '#b00020', color: '#fff', padding: '6px 10px', borderRadius: 4, fontSize: 12 }}>{syncError}</div>}
    </UserContext.Provider>
  );
};

export default AppRoutes;