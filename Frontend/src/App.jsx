import React from 'react';
import AppRoutes from './Routes/App.routes';
import Layout from './components/Layout';

export default function App() {
  return (
    <Layout>
      <AppRoutes />
    </Layout>
  );
}