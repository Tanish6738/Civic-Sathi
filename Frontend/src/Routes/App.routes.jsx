import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import adminEmails from '../data/data.json';
import Profile from '../components/User/Profile';
import Landing from '../components/Basic/landing';
import UsersHome from '../components/User/UsersHome';
import Report from '../components/User/Report';
import CategoryFormPage from '../components/CategoryFroms/CategoryFormPage';
import { Routes, Route } from 'react-router-dom';
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

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Landing />} />
    <Route path="/users" element={withLayout(<UsersHome />)} />
    <Route path="/report" element={withLayout(<Report />)} />
  <Route path="/my-reports" element={withLayout(<MyReports />)} />
  <Route path="/categories" element={withLayout(<CategoryFormPage />)} />
    <Route path="/profile" element={withLayout(<Profile />)} />
    <Route path="/admin" element={withLayout(<RequireAdmin><AdminDashBoard /></RequireAdmin>)} />
    <Route path="/admin/reports" element={withLayout(<RequireAdmin><AllReports /></RequireAdmin>)} />
  </Routes>
);

export default AppRoutes;