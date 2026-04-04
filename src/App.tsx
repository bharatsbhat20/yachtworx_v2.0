import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Navbar } from './components/layout/Navbar';
import { Landing } from './pages/Landing';
import { OwnerDashboard } from './pages/OwnerDashboard';
import { BoatProfile } from './pages/BoatProfile';
import { Marketplace } from './pages/Marketplace';
import { ServiceRequests } from './pages/ServiceRequests';
import { Documents } from './pages/Documents';
import { Messages } from './pages/Messages';
import { ProviderLanding } from './pages/ProviderLanding';
import ProviderRegistration from './pages/ProviderRegistration';
import ProviderDashboard from './pages/ProviderDashboard';
import AdminDashboard from './pages/AdminDashboard';
import { AuthPage } from './pages/AuthPage';
import { MarinaDiscovery } from './pages/MarinaDiscovery';
import { MarinaProfile } from './pages/MarinaProfile';
import MarinaDashboard from './pages/MarinaDashboard';
import { useAuthStore } from './store/authStore';

const noNavbarRoutes = ['/auth', '/register-provider', '/admin'];

// ─── ProtectedRoute ───────────────────────────────────────────────────────────
// Redirects to /auth if the user is not authenticated.

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return null; // wait for initAuth to resolve
  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

// ─── AppContent ───────────────────────────────────────────────────────────────

const AppContent: React.FC = () => {
  const location = useLocation();
  const showNavbar = !noNavbarRoutes.includes(location.pathname);
  const { initAuth } = useAuthStore();

  // Restore Supabase session on first mount (no-op in demo mode)
  useEffect(() => {
    initAuth();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {showNavbar && <Navbar />}
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* Public */}
          <Route path="/" element={<Landing />} />
          <Route path="/for-providers" element={<ProviderLanding />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/register-provider" element={<ProviderRegistration />} />

          {/* Protected — owner */}
          <Route path="/dashboard" element={<ProtectedRoute><OwnerDashboard /></ProtectedRoute>} />
          <Route path="/boats/:id" element={<ProtectedRoute><BoatProfile /></ProtectedRoute>} />
          <Route path="/marketplace" element={<ProtectedRoute><Marketplace /></ProtectedRoute>} />
          <Route path="/requests" element={<ProtectedRoute><ServiceRequests /></ProtectedRoute>} />
          <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />

          {/* Protected — provider */}
          <Route path="/provider-dashboard" element={<ProtectedRoute><ProviderDashboard /></ProtectedRoute>} />

          {/* Public — marina discovery */}
          <Route path="/marinas" element={<MarinaDiscovery />} />
          <Route path="/marinas/:id" element={<MarinaProfile />} />

          {/* Protected — marina owner/operator */}
          <Route path="/marina-dashboard" element={<ProtectedRoute><MarinaDashboard /></ProtectedRoute>} />

          {/* Protected — admin */}
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
        </Routes>
      </AnimatePresence>
    </>
  );
};

// ─── App ──────────────────────────────────────────────────────────────────────

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
