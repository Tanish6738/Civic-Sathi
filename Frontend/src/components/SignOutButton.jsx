import React, { useState } from 'react';
import { useClerk } from '@clerk/clerk-react';

// Reusable sign-out button for a Vite/React (non-Next.js) setup
const SignOutButton = ({ redirectUrl = '/', className = '' }) => {
  const { signOut } = useClerk();
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    try {
      setLoading(true);
      await signOut({ redirectUrl });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleSignOut}
      disabled={loading}
      className={`inline-flex items-center gap-1 h-8 px-3 rounded-md text-xs font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 active:scale-95 disabled:opacity-50 transition ${className}`}
    >
      {loading ? 'Signing out...' : 'Sign out'}
    </button>
  );
};

export default SignOutButton;
