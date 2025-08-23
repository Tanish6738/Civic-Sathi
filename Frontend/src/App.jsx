import React, { useState } from 'react';
import AppRoutes from './Routes/App.routes';
import SidebarTab from './components/SidebarTab';
import Navbar from './components/Navbar';

export default function App() {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen flex bg-gray-100 text-gray-900">
      <SidebarTab open={open} setOpen={setOpen} />
      <div className="flex-1 flex flex-col min-h-screen">
        <Navbar open={open} setOpen={setOpen} />
        <main className="flex-1 p-4 md:p-6">
          <AppRoutes />
        </main>
      </div>
    </div>
  );
}