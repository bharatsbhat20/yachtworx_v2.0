/**
 * Auth Page — TRD Section 3.1 & 4.1
 *
 * Implements:
 * - Login (email/password + role)
 * - Registration (first name, last name, email, password, role)
 * - Password validation rules (min 8, 1 uppercase, 1 number)
 * - Email verification step (post-registration)
 * - Forgot password flow
 * - Unverified account notice
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Anchor, Eye, EyeOff, ArrowRight, Mail, CheckCircle, RefreshCw, AlertCircle, Check, X } from 'lucide-react';
import { useAuthStore, validatePassword, type RegistrationData } from '../store/authStore';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

// ─── Password Strength Indicator ─────────────────────────────────────────────

const PasswordStrength: React.FC<{ password: string }> = ({ password }) => {
  if (!password) return null;
  const v = validatePassword(password);
  const rules = [
    { label: 'At least 8 characters', met: v.minLength },
    { label: '1 uppercase letter', met: v.hasUppercase },
    { label: '1 number', met: v.hasNumber },
  ];
  return (
    <div className="mt-2 space-y-1">
      {rules.map(rule => (
        <div key={rule.label} className={`flex items-center gap-2 text-xs transition-colors ${rule.met ? 'text-teal-600' : 'text-gray-400'}`}>
          {rule.met ? <Check size={11} className="text-teal-500" /> : <X size={11} className="text-gray-300" />}
          {rule.label}
        </div>
      ))}
    </div>
  );
};

// ─── Email Verification Screen ────────────────────────────────────────────────

const EmailVerificationScreen: React.FC<{ email: string }> = ({ email }) => {
  const { verifyEmail, resendVerification, isLoading, authFlow, setFlow } = useAuthStore();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [resent, setResent] = useState(false);
  const [canResend, setCanResend] = useState(true);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    await verifyEmail(code || '123456'); // demo: any code works
    navigate('/dashboard');
  };

  const handleResend = async () => {
    if (!canResend) return;
    setCanResend(false);
    setResent(true);
    await resendVerification();
    // Re-enable after 60s
    setTimeout(() => setCanResend(true), 60000);
  };

  // Demo: skip verification
  const handleSkip = async () => {
    await verifyEmail('demo');
    navigate('/dashboard');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center"
    >
      <div className="w-16 h-16 bg-ocean-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <Mail size={28} className="text-ocean-500" />
      </div>
      <h2 className="text-xl font-heading font-bold text-navy-500 mb-2">Check your email</h2>
      <p className="text-sm text-gray-500 mb-6">
        We sent a verification link to <span className="font-semibold text-navy-500">{email}</span>
      </p>

      {/* TRD: email verification required before full access */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left">
        <div className="flex items-start gap-3">
          <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            <span className="font-semibold">Access limited</span> until your email is verified. You won't be able to add boats or access the marketplace.
          </p>
        </div>
      </div>

      <form onSubmit={handleVerify} className="space-y-4 mb-4">
        <Input
          label="Verification Code (from email)"
          placeholder="Enter 6-digit code"
          value={code}
          onChange={e => setCode(e.target.value)}
          type="text"
        />
        <Button variant="hero" type="submit" fullWidth size="lg" disabled={isLoading}>
          {isLoading ? 'Verifying...' : 'Verify Email'}
          <CheckCircle size={18} />
        </Button>
      </form>

      <button
        onClick={handleResend}
        disabled={!canResend || isLoading}
        className="text-sm text-ocean-500 hover:text-ocean-600 flex items-center gap-1.5 mx-auto disabled:opacity-50 disabled:cursor-not-allowed mb-3"
      >
        <RefreshCw size={13} />
        {resent && !canResend ? 'Email resent — check your inbox' : 'Resend verification email'}
      </button>

      {/* Demo shortcut */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-400 mb-2">Demo mode</p>
        <button onClick={handleSkip} className="text-xs text-ocean-500 hover:underline">
          Skip verification (demo only) →
        </button>
      </div>
    </motion.div>
  );
};

// ─── Forgot Password Screen ───────────────────────────────────────────────────

const ForgotPasswordScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { forgotPassword, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await forgotPassword(email);
    setSent(true);
  };

  if (sent) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
        <CheckCircle size={40} className="text-teal-500 mx-auto mb-4" />
        <h2 className="text-lg font-heading font-bold text-navy-500 mb-2">Check your inbox</h2>
        <p className="text-sm text-gray-500 mb-6">If an account exists for <strong>{email}</strong>, a reset link has been sent.</p>
        <button onClick={onBack} className="text-sm text-ocean-500 hover:text-ocean-600 font-medium">
          ← Back to sign in
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h2 className="text-xl font-heading font-semibold text-navy-500 mb-1">Reset your password</h2>
      <p className="text-sm text-gray-400 mb-6">Enter your email and we'll send a reset link.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email Address"
          placeholder="james@example.com"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <Button variant="hero" type="submit" fullWidth size="lg" disabled={isLoading}>
          {isLoading ? 'Sending...' : 'Send Reset Link'}
          <ArrowRight size={18} />
        </Button>
      </form>
      <button onClick={onBack} className="mt-4 text-sm text-gray-500 hover:text-gray-700 w-full text-center">
        ← Back to sign in
      </button>
    </motion.div>
  );
};

// ─── Main Auth Page ───────────────────────────────────────────────────────────

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, register, authFlow, pendingEmail, isLoading, authError, clearError } = useAuthStore();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('james@yachtworx.io');
  const [password, setPassword] = useState('Password1');
  const [role, setRole] = useState<'owner' | 'provider' | 'admin'>('owner');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    await login(email, password, role);
    navigate(role === 'provider' ? '/provider-dashboard' : role === 'admin' ? '/admin' : '/dashboard');
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const data: RegistrationData = { firstName, lastName, email, password, role };
    await register(data);
    // If successful, authFlow becomes 'verify_email' and the screen switches
  };

  // Show email verification screen post-registration
  if (authFlow === 'verify_email' && pendingEmail) {
    return (
      <div className="min-h-screen bg-hero-gradient flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="p-2 bg-gradient-to-br from-ocean-500 to-teal-500 rounded-xl">
                <Anchor size={20} className="text-white" />
              </div>
              <span className="font-heading font-bold text-2xl text-navy-500">
                Yacht<span className="text-teal-500">worx</span>
              </span>
            </div>
            <EmailVerificationScreen email={pendingEmail} />
          </div>
          <div className="mt-6 text-center">
            <Link to="/" className="text-sm text-white/70 hover:text-white transition-colors">Back to homepage</Link>
          </div>
        </div>
      </div>
    );
  }

  if (showForgot) {
    return (
      <div className="min-h-screen bg-hero-gradient flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="p-2 bg-gradient-to-br from-ocean-500 to-teal-500 rounded-xl">
                <Anchor size={20} className="text-white" />
              </div>
              <span className="font-heading font-bold text-2xl text-navy-500">
                Yacht<span className="text-teal-500">worx</span>
              </span>
            </div>
            <ForgotPasswordScreen onBack={() => setShowForgot(false)} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-hero-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
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
            {(['login', 'signup'] as const).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); clearError(); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-heading font-semibold transition-all ${
                  mode === m ? 'bg-white text-navy-500 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <h2 className="text-xl font-heading font-semibold text-navy-500 mb-1">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="text-sm text-gray-400 mb-6">
            {mode === 'login' ? 'Sign in to manage your fleet' : 'Join thousands of yacht owners and professionals'}
          </p>

          {/* Role Selector */}
          <div className="flex gap-2 mb-6">
            {([
              { value: 'owner',    label: 'Boat Owner',       color: 'border-ocean-500 bg-ocean-50 text-ocean-700' },
              { value: 'provider', label: 'Service Provider', color: 'border-teal-500 bg-teal-50 text-teal-700' },
              { value: 'admin',    label: 'Admin',            color: 'border-navy-500 bg-navy-50 text-navy-700' },
            ] as const).map(({ value, label, color }) => (
              <button
                key={value}
                onClick={() => {
                  setRole(value);
                  if (value === 'owner')    setEmail('james@yachtworx.io');
                  if (value === 'provider') setEmail('provider@yachtworx.com');
                  if (value === 'admin')    setEmail('admin@yachtworx.com');
                }}
                className={`flex-1 p-3 rounded-xl border-2 text-xs font-medium transition-all text-center ${
                  role === value ? color : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Error Banner */}
          <AnimatePresence>
            {authError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2"
              >
                <AlertCircle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{authError}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {mode === 'login' ? (
              <motion.form
                key="login"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleLogin}
                className="space-y-4"
              >
                <Input
                  label="Email Address"
                  placeholder="james@example.com"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
                <div className="relative">
                  <Input
                    label="Password"
                    placeholder="••••••••"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    rightIcon={
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-gray-400 hover:text-gray-600">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    }
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowForgot(true)}
                    className="text-sm text-ocean-500 hover:text-ocean-600"
                  >
                    Forgot password?
                  </button>
                </div>
                <Button variant="hero" type="submit" fullWidth size="lg" disabled={isLoading}>
                  {isLoading ? 'Signing in...' : 'Sign In'}
                  <ArrowRight size={18} />
                </Button>
              </motion.form>
            ) : (
              <motion.form
                key="signup"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleSignup}
                className="space-y-4"
              >
                {/* TRD: firstName + lastName as separate fields */}
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="First Name"
                    placeholder="James"
                    type="text"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    required
                  />
                  <Input
                    label="Last Name"
                    placeholder="Harrison"
                    type="text"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    required
                  />
                </div>
                <Input
                  label="Email Address"
                  placeholder="james@example.com"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
                <div>
                  <div className="relative">
                    <Input
                      label="Password"
                      placeholder="Min 8 chars, 1 uppercase, 1 number"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      rightIcon={
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-gray-400 hover:text-gray-600">
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      }
                    />
                  </div>
                  {/* TRD: password validation visual feedback */}
                  <PasswordStrength password={password} />
                </div>
                <Button
                  variant="hero"
                  type="submit"
                  fullWidth
                  size="lg"
                  disabled={isLoading || !validatePassword(password).isValid}
                >
                  {isLoading ? 'Creating account...' : 'Create Account'}
                  <ArrowRight size={18} />
                </Button>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); clearError(); }}
                className="text-ocean-500 font-semibold hover:text-ocean-600"
              >
                {mode === 'login' ? 'Sign up free' : 'Sign in'}
              </button>
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center mb-2">Demo accounts (password: <span className="font-mono text-gray-500">Password1</span>)</p>
            <div className="space-y-1">
              {[
                { role: 'Owner',    email: 'james@yachtworx.io',       color: 'text-ocean-600' },
                { role: 'Provider', email: 'provider@yachtworx.com',   color: 'text-teal-600' },
                { role: 'Admin',    email: 'admin@yachtworx.com',      color: 'text-navy-500' },
              ].map(({ role, email, color }) => (
                <div key={role} className="flex items-center justify-between text-xs">
                  <span className={`font-medium ${color}`}>{role}</span>
                  <span className="font-mono text-gray-400">{email}</span>
                </div>
              ))}
            </div>
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
