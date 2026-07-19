import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { A11yProvider } from './context/A11yContext.js';
import A11ySettings from './components/A11ySettings.js';

// Lazy-loaded pages for code splitting
const LoginPage = lazy(() => import('./pages/LoginPage.js'));
const FanAppPage = lazy(() => import('./pages/FanAppPage.js'));
const OpsDashboardPage = lazy(() => import('./pages/OpsDashboardPage.js'));

function PageLoader() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg,#1d8ef7,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>🏟️</div>
      <div className="spinner" style={{ width: 28, height: 28 }} aria-label="Loading…" role="status" />
      <span className="sr-only">Loading FanPulse AI…</span>
    </div>
  );
}

/** Protected route — redirects to login if not authenticated. */
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles && user && !allowedRoles.includes(user.role)) return <Navigate to="/fan" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated, user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to={user?.role === 'fan' ? '/fan' : '/ops'} replace /> : <LoginPage />} />
      <Route path="/fan" element={<ProtectedRoute><FanAppPage /></ProtectedRoute>} />
      <Route path="/ops" element={<ProtectedRoute allowedRoles={['volunteer', 'organizer']}><OpsDashboardPage /></ProtectedRoute>} />
      <Route path="/" element={<Navigate to={isAuthenticated ? (user?.role === 'fan' ? '/fan' : '/ops') : '/login'} replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <A11yProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <AppRoutes />
          </Suspense>
          <A11ySettings />
        </BrowserRouter>
      </A11yProvider>
    </AuthProvider>
  );
}
