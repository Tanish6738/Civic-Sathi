import React from 'react';
import AppRoutes from './Routes/App.routes';
import { ToastProvider } from './contexts/ToastContext';

// Root app now leaves layout decisions to individual routes so the landing page
// can exist outside the authenticated layout.
export default function App() {
  return <ToastProvider>
    <AppRoutes />
  </ToastProvider>;
}