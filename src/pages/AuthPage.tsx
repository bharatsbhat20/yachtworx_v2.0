import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Anchor, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'owner' | 'provider'>('owner');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login({
      id: 'user-1',
      name: 'James Harrison',
      email: 'james@yachtworx.io',
      role,
      avatar: 'https://randomuser.me/api/portraits/men/41.jpg',
      location: 'Marina del Rey, CA',
    });
    navigate(role === 'owner' ? '/dashboard' : '/provider-dashboard');
  };

  return (
    <div className="min-h-screen bg-hero-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 1, y: 0 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-2xl p-8"
        >
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="p-2 bg-gradient-to-br from-ocean-500 to-teal-500 rounded-xl">
              <Anchor size={20} className="text-white" />
            </div>
            <span className="font-heading font-bold text-2xl text-navy-500">
              Yacht<span className="text-teal-500">worx</span>
            </span>
          </div>

          {/* Mode Toggle */}
          <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-heading font-semibold transition-all ${
                mode === 'login' ? 'bg-white text-navy-500 shadow-sm' : 'text-gray-500'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-heading font-semibold transition-all ${
                mode === 'signup' ? 'bg-white text-navy-500 shadow-sm' : 'text-gray-500'
              }`}
            >
              Create Account
            </button>
          </div>

          <h2 className="text-xl font-heading font-semibold text-navy-500 mb-1">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="text-sm text-gray-400 mb-6">
            {mode === 'login' ? 'Sign in to manage your fleet' : 'Join thousands of yacht owners and professionals'}
          </p>

          {/* Role Selector */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => setRole('owner')}
              className={`flex-1 p-3 rounded-xl border-2 text-sm font-medium transition-all text-center ${
                role === 'owner'
                  ? 'border-ocean-500 bg-ocean-50 text-ocean-700'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              Boat Owner
            </button>
            <button
              onClick={() => setRole('provider')}
              className={`flex-1 p-3 rounded-xl border-2 text-sm font-medium transition-all text-center ${
                role === 'provider'
                  ? 'border-teal-500 bg-teal-50 text-teal-700'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              Service Provider
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <Input
                label="Full Name"
                placeholder="James Harrison"
                type="text"
              />
            )}
            <Input
              label="Email Address"
              placeholder="james@example.com"
              type="email"
              defaultValue="james@yachtworx.io"
            />
            <div className="relative">
              <Input
                label="Password"
                placeholder="••••••••"
                type={showPassword ? 'text' : 'password'}
                defaultValue="password123"
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />
            </div>

            {mode === 'login' && (
              <div className="flex justify-end">
                <a href="#" className="text-sm text-ocean-500 hover:text-ocean-600">Forgot password?</a>
              </div>
            )}

            <Button variant="hero" type="submit" fullWidth size="lg">
              {mode === 'login' ? 'Sign In' : 'Create Account'}
              <ArrowRight size={18} />
            </Button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">
              {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                className="text-ocean-500 font-semibold hover:text-ocean-600"
              >
                {mode === 'login' ? 'Sign up free' : 'Sign in'}
              </button>
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">Demo mode: Click Sign In to enter the app</p>
          </div>
        </motion.div>

        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-white/70 hover:text-white transition-colors">
            Back to homepage
          </Link>
        </div>
      </div>
    </div>
  );
};
