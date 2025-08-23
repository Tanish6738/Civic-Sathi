import React from 'react'
import Profile from '../components/User/Profile'

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/profile" element={<Profile />} />
    </Routes>
  )
}

export default AppRoutes