import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppRoutes } from './app/AppRoutes';

function App() {
  return (
    <Router>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          className: '!rounded-2xl !border !border-slate-700 !bg-slate-900 !px-4 !py-3 !text-sm !font-bold !text-slate-100 !shadow-2xl',
          style: {
            maxWidth: 'calc(100vw - 32px)',
          },
          success: {
            iconTheme: {
              primary: '#8b5cf6',
              secondary: '#0f172a',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#0f172a',
            },
          },
        }}
      />
      <AppRoutes />
    </Router>
  );
}

export default App;
