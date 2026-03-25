import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
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
import { ProviderRegistration } from './pages/ProviderRegistration';
import { ProviderDashboard } from './pages/ProviderDashboard';
import { AuthPage } from './pages/AuthPage';

const noNavbarRoutes = ['/auth', '/register-provider'];

const AppContent: React.FC = () => {
  const location = useLocation();
  const showNavbar = !noNavbarRoutes.includes(location.pathname);

  return (
    <>
      {showNavbar && <Navbar />}
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<OwnerDashboard />} />
          <Route path="/boats/:id" element={<BoatProfile />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/requests" element={<ServiceRequests />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/for-providers" element={<ProviderLanding />} />
          <Route path="/register-provider" element={<ProviderRegistration />} />
          <Route path="/provider-dashboard" element={<ProviderDashboard />} />
          <Route path="/auth" element={<AuthPage />} />
        </Routes>
      </AnimatePresence>
    </>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
