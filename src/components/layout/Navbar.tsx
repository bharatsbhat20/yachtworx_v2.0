import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Anchor,
  LayoutDashboard,
  Ship,
  ShoppingBag,
  ClipboardList,
  MessageSquare,
  FileText,
  Menu,
  X,
  ChevronDown,
  LogOut,
  Settings,
  RefreshCw,
  Bell,
  Shield,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuthStore } from '../../store/authStore';
import type { UserRole } from '../../types';
import { Avatar } from '../ui/Avatar';
import { isDemoMode } from '../../lib/supabase';

const ownerNavLinks = [
  { to: '/dashboard',       label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/boats/boat-1',    label: 'My Boats',   icon: Ship },
  { to: '/marketplace',     label: 'Marketplace',icon: ShoppingBag },
  { to: '/requests',        label: 'Services',   icon: ClipboardList },
  { to: '/messages',        label: 'Messages',   icon: MessageSquare },
  { to: '/documents',       label: 'Documents',  icon: FileText },
];

const providerNavLinks = [
  { to: '/provider-dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/requests',           label: 'Jobs',       icon: ClipboardList },
  { to: '/messages',           label: 'Messages',   icon: MessageSquare },
];

const adminNavLinks = [
  { to: '/admin', label: 'Admin Panel', icon: Shield },
];

export const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { currentUser, logout, switchRole } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const isLanding = location.pathname === '/' || location.pathname === '/for-providers' || location.pathname === '/auth';

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setProfileOpen(false);
  }, [location]);

  const navLinks =
    currentUser?.role === 'provider' ? providerNavLinks :
    currentUser?.role === 'admin'    ? adminNavLinks :
    ownerNavLinks;

  const handleSwitchRole = () => {
    const cycle: Record<string, UserRole> = { owner: 'provider', provider: 'admin', admin: 'owner' };
    const newRole: UserRole = cycle[currentUser?.role ?? 'owner'] ?? 'owner';
    switchRole(newRole);
    const dest = newRole === 'provider' ? '/provider-dashboard' : newRole === 'admin' ? '/admin' : '/dashboard';
    navigate(dest);
    setProfileOpen(false);
  };

  const handleLogout = async () => {
    setProfileOpen(false);
    setMobileOpen(false);
    try {
      await logout();
    } catch (_) {
      // ignore errors — always navigate away
    }
    navigate('/');
  };

  return (
    <header
      className={clsx(
        'fixed top-0 left-0 right-0 z-40 transition-all duration-300',
        isScrolled || !isLanding
          ? 'bg-navy-500/95 backdrop-blur-md shadow-lg'
          : 'bg-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="p-2 bg-gradient-to-br from-ocean-500 to-teal-500 rounded-xl group-hover:scale-105 transition-transform">
              <Anchor size={18} className="text-white" />
            </div>
            <span className="text-white font-heading font-bold text-xl tracking-tight">
              Yacht<span className="text-teal-400">worx</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  location.pathname === to
                    ? 'bg-white/15 text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                )}
              >
                <Icon size={15} />
                {label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <>
                <button className="relative p-2 text-white/70 hover:text-white transition-colors hidden sm:block">
                  <Bell size={18} />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                </button>

                {/* Profile dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-white/10 transition-colors"
                  >
                    <Avatar
                      src={currentUser.avatarUrl ?? currentUser.avatar}
                      alt={currentUser.name}
                      fallback={currentUser.name}
                      size="sm"
                    />
                    <span className="hidden sm:block text-sm text-white/90 font-medium">
                      {currentUser.name.split(' ')[0]}
                    </span>
                    <ChevronDown
                      size={14}
                      className={clsx(
                        'text-white/60 transition-transform hidden sm:block',
                        profileOpen && 'rotate-180'
                      )}
                    />
                  </button>

                  <AnimatePresence>
                    {profileOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 overflow-hidden"
                      >
                        <div className="px-4 py-3 border-b border-gray-100">
                          <p className="text-sm font-semibold text-navy-500">{currentUser.name}</p>
                          <p className="text-xs text-gray-400">{currentUser.email}</p>
                          <span className="inline-flex items-center gap-1 mt-1.5 text-xs bg-ocean-50 text-ocean-600 px-2 py-0.5 rounded-full font-medium capitalize">
                            {currentUser.role}
                          </span>
                        </div>
                        {isDemoMode && (
                          <button
                            onClick={handleSwitchRole}
                            className="flex items-center gap-2.5 px-4 py-2.5 w-full text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                          >
                            <RefreshCw size={14} className="text-ocean-500" />
                            Switch to {currentUser.role === 'owner' ? 'Provider' : currentUser.role === 'provider' ? 'Admin' : 'Owner'} Mode
                          </button>
                        )}
                        <button className="flex items-center gap-2.5 px-4 py-2.5 w-full text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                          <Settings size={14} className="text-gray-400" />
                          Settings
                        </button>
                        <div className="border-t border-gray-100 mt-1 pt-1">
                          <button
                            onClick={handleLogout}
                            className="flex items-center gap-2.5 px-4 py-2.5 w-full text-sm text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <LogOut size={14} />
                            Sign Out
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <Link to="/auth" className="btn-ocean text-sm py-2 px-4">
                Sign In
              </Link>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 text-white/80 hover:text-white transition-colors"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-navy-600/95 backdrop-blur-md border-t border-white/10 overflow-hidden"
          >
            <nav className="px-4 py-4 space-y-1">
              {navLinks.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className={clsx(
                    'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                    location.pathname === to
                      ? 'bg-white/15 text-white'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  )}
                >
                  <Icon size={18} />
                  {label}
                </Link>
              ))}
              {currentUser && (
                <>
                  <div className="border-t border-white/10 pt-3 mt-3">
                    {isDemoMode && (
                      <button
                        onClick={handleSwitchRole}
                        className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        <RefreshCw size={18} />
                        Switch to {currentUser.role === 'owner' ? 'Provider' : currentUser.role === 'provider' ? 'Admin' : 'Owner'} Mode
                      </button>
                    )}
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut size={18} />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
