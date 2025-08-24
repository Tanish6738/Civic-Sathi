import React, { createContext, useContext, useState, useCallback } from 'react';

// Holds the backend-synced user document (NOT the Clerk user object)
export const UserContext = createContext({
  dbUser: null,
  setDbUser: () => {},
  refreshDbUser: async () => {},
});

export function useDbUser() {
  return useContext(UserContext);
}

export function UserProvider({ children, initialUser = null, loader }) {
  const [dbUser, setDbUser] = useState(initialUser);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refreshDbUser = useCallback(async () => {
    if (!loader) return;
    setLoading(true); setError(null);
    try {
      const fresh = await loader();
      setDbUser(fresh);
    } catch (e) {
      setError(e?.message || 'Failed to refresh user');
    } finally {
      setLoading(false);
    }
  }, [loader]);

  return (
    <UserContext.Provider value={{ dbUser, setDbUser, refreshDbUser, loading, error }}>
      {children}
    </UserContext.Provider>
  );
}
