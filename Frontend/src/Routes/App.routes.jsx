import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import adminEmails from '../data/data.json';
import Profile from '../components/User/Profile';
import Landing from '../components/Basic/landing';
import UsersHome from '../components/User/UsersHome';
import Report from '../components/User/Report';
import { Routes, Route } from 'react-router-dom';
import AdminDashBoard from '../components/Admin/AdminDashBoard';

const RequireAdmin = ({ children }) => {
  const { isLoaded, user } = useUser();
  if (!isLoaded) return null; // could render a spinner
  const email = user?.primaryEmailAddress?.emailAddress;
  const isAdmin = !!email && Array.isArray(adminEmails) && adminEmails.includes(email);
  return isAdmin ? children : <Navigate to="/" replace />;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Landing />} />
    <Route path="/users" element={<UsersHome />} />
    <Route path="/report" element={<Report />} />
    <Route path="/profile" element={<Profile />} />
    <Route path="/admin" element={<RequireAdmin><AdminDashBoard /></RequireAdmin>} />
  </Routes>
);

export default AppRoutes;