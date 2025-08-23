import React from 'react';
import { NavLink } from 'react-router-dom';
import Navbar from '../Navbar';

const Landing = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <Navbar />
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-indigo-200">
          Welcome to Civic Sathi
        </h1>
        <p className="text-gray-300 mb-8 leading-relaxed text-lg">
          Streamline civic issue reporting and administration. Sign in to submit and track reports, or explore the admin dashboard if you have elevated access.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <NavLink to="/report" className="inline-flex items-center justify-center px-6 h-12 rounded-md bg-indigo-600 hover:bg-indigo-500 active:scale-95 font-medium shadow">
            Go to App
          </NavLink>
          <NavLink to="/users" className="inline-flex items-center justify-center px-6 h-12 rounded-md bg-white/10 hover:bg-white/20 backdrop-blur border border-white/15 font-medium">
            Users Area
          </NavLink>
        </div>
      </main>
      <footer className="py-6 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} Civic Sathi. All rights reserved.
      </footer>
    </div>
  );
};

export default Landing;