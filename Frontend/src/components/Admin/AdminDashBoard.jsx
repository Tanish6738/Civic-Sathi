import React from 'react';
import CallDataSection from './CallDataSection';
import WebComplaintsSection from './WebComplaintsSection';
import UserManagement from './UserManagement';

// Container styling assumes Tailwind (present in dependencies). Adjust if needed.
const AdminDashBoard = () => {
  return (
    <div className="p-6 flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-sm text-gray-500">Overview of call center performance and website complaints.</p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 items-start">
        <CallDataSection />
        <WebComplaintsSection />
        <div className="xl:col-span-2">
          <UserManagement />
        </div>
      </div>
    </div>
  );
};

export default AdminDashBoard;