import React from 'react';
import ProgressiveForm from './Froms';
import { categoryData } from '../../data/categoryData';

// Page wrapper for ProgressiveForm so it fits existing layout routing
const CategoryFormPage = () => {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-800">Citizen Services</h1>
        <p className="text-sm text-gray-600 mt-1">Browse available categories and submit a service selection.</p>
      </div>
      <div className="bg-white/80 backdrop-blur rounded-xl border border-gray-200 shadow-sm p-6">
        <ProgressiveForm
          data={categoryData}
          onSubmit={(sel) => {
            // For now just log; could navigate or open link
            console.log('Selected:', sel);
            if (sel.href) {
              try { window.open(sel.href, '_blank', 'noopener'); } catch(e) { /* ignore */ }
            }
          }}
          onCancel={() => {
            // Simple back navigation if history length > 1 else redirect home
            if (window.history.length > 1) window.history.back(); else window.location.assign('/');
          }}
        />
      </div>
    </div>
  );
};

export default CategoryFormPage;
