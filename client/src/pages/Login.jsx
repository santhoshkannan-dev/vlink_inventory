import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ShieldAlert, 
  Boxes, 
  History, 
  BarChart3, 
  ArrowRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

export default function Login() {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const result = await login(email, password);
      if (!result.success) {
        setError(result.message || 'Authentication failed. Please verify your email and password.');
      }
    } catch (err) {
      setError(err.message || 'An unexpected connection error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFillCredentials = (demoEmail, demoPw) => {
    setEmail(demoEmail);
    setPassword(demoPw);
    setError('');
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#F5F7FB] font-sans text-slate-800 antialiased selection:bg-blue-600 selection:text-white">
      
      {/* ========================================================= */}
      {/* LEFT PANEL: Enterprise Telecom Branding & Feature Highlights */}
      {/* ========================================================= */}
      <section 
        className="w-full lg:w-[48%] xl:w-[45%] bg-[#101C35] text-white flex flex-col justify-between p-8 sm:p-12 lg:p-16 relative overflow-hidden shrink-0 border-b lg:border-b-0 lg:border-r border-slate-800"
        aria-label="VLink Brand Information"
      >
        {/* Decorative Fiber-Optic & Geometric Grid Background */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" viewBox="0 0 600 800">
            <defs>
              <linearGradient id="fiberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#245FF5" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#38BDF8" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.2" />
              </linearGradient>
              <radialGradient id="glowSpot" cx="20%" cy="30%" r="50%">
                <stop offset="0%" stopColor="#245FF5" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#101C35" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width="600" height="800" fill="url(#glowSpot)" />
            {/* Subtle fiber line paths */}
            <path d="M-50,120 C150,80 300,260 650,180" fill="none" stroke="url(#fiberGrad)" strokeWidth="1.5" strokeDasharray="6 4" />
            <path d="M-80,320 C120,240 280,480 650,390" fill="none" stroke="url(#fiberGrad)" strokeWidth="1.5" />
            <path d="M-20,540 C180,450 360,650 650,560" fill="none" stroke="url(#fiberGrad)" strokeWidth="1" strokeDasharray="4 4" />
            <path d="M-40,700 C200,600 400,780 650,720" fill="none" stroke="url(#fiberGrad)" strokeWidth="1.5" />
            {/* Glowing nodes */}
            <circle cx="150" cy="80" r="4" fill="#38BDF8" />
            <circle cx="300" cy="260" r="3" fill="#245FF5" />
            <circle cx="280" cy="480" r="4.5" fill="#38BDF8" />
            <circle cx="360" cy="650" r="3.5" fill="#10B981" />
          </svg>
        </div>

        {/* Top Branding Section */}
        <div className="relative z-10">
          <div className="flex items-center gap-3.5">
            {/* VL Brand Emblem */}
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#245FF5] to-[#1d4ed8] flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-blue-500/25 border border-blue-400/30 shrink-0">
              VL
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white leading-tight">VLink Networks</h1>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/20">
                  Enterprise
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Inventory Management System</p>
            </div>
          </div>
        </div>

        {/* Central Overview & Feature Value Proposition */}
        <div className="relative z-10 my-10 lg:my-0 space-y-8">
          <div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Smart Inventory.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-300">
                Reliable Operations.
              </span>
            </h2>
            <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed max-w-lg font-normal">
              Manage telecom materials, track stock movements, and monitor inventory operations in one place.
            </p>
          </div>

          {/* Three Feature Highlight Badges */}
          <div className="space-y-3.5 max-w-lg">
            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm transition-all hover:border-slate-700/80">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <Boxes className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white tracking-wide">Inventory Tracking</h3>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  Real-time stock monitoring with critical threshold safety alerts.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm transition-all hover:border-slate-700/80">
              <div className="w-9 h-9 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <History className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white tracking-wide">Stock Movement History</h3>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  Unbroken audit ledger recording before and after quantities for every transaction.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm transition-all hover:border-slate-700/80">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white tracking-wide">Actionable Reports</h3>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  Instant material consumption analytics with authorized PDF and Excel exports.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Left Status & Trust Indicator */}
        <div className="relative z-10 pt-6 border-t border-slate-800/70 hidden lg:flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-medium text-slate-300">All systems operational</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>256-bit TLS Encrypted</span>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* RIGHT PANEL: Centered Enterprise Sign-In Card */}
      {/* ========================================================= */}
      <main 
        className="flex-1 bg-[#F5F7FB] flex flex-col justify-between p-6 sm:p-10 lg:p-16 relative overflow-y-auto"
        aria-label="User Authentication Section"
      >
        {/* Mobile Header (Shown only on small/medium screens where left branding is reduced) */}
        <div className="lg:hidden flex items-center justify-center gap-3 pb-6 border-b border-slate-200">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-extrabold text-sm shadow-md">
            VL
          </div>
          <span className="text-base font-bold text-slate-900 tracking-tight">VLink Networks</span>
        </div>

        {/* Center Form Card */}
        <div className="w-full max-w-md mx-auto my-auto py-8">
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xl shadow-slate-200/70 p-8 sm:p-10 transition-all">
            
            {/* Form Header */}
            <header className="mb-8">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Welcome back
              </h2>
              <p className="text-sm text-slate-500 mt-1.5 font-medium">
                Sign in to your VLink workspace.
              </p>
            </header>

            {/* Error Banner */}
            {error && (
              <div 
                role="alert" 
                aria-live="polite"
                className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-3 transition-all animate-fadeIn"
              >
                <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm font-semibold leading-relaxed">
                  {error}
                </div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              
              {/* Email Input Field */}
              <div>
                <label 
                  htmlFor="email" 
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2"
                >
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@vlink.com"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50/70 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 font-medium focus:bg-white focus:outline-none focus:border-[#245FF5] focus:ring-2 focus:ring-[#245FF5]/20 transition-all"
                    disabled={submitting}
                  />
                </div>
              </div>

              {/* Password Input Field with Show/Hide Toggle */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label 
                    htmlFor="password" 
                    className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                  >
                    Password
                  </label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-11 py-3 bg-slate-50/70 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 font-medium focus:bg-white focus:outline-none focus:border-[#245FF5] focus:ring-2 focus:ring-[#245FF5]/20 transition-all"
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none focus:text-[#245FF5] cursor-pointer transition-colors"
                    tabIndex={0}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  id="submit-btn"
                  type="submit"
                  disabled={submitting || !email.trim() || !password.trim()}
                  className="w-full py-3.5 px-5 bg-[#245FF5] hover:bg-blue-600 active:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0"></div>
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Quick-Access Workspace Roles (Streamlines verification for Admin & Staff) */}
            <div className="mt-8 pt-6 border-t border-slate-100">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center mb-3">
                Workspace Role Fast-Fill
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleFillCredentials('admin@vlink.com', 'admin123')}
                  className="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-blue-50/60 hover:border-blue-300 text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 group-hover:text-blue-600">Admin</span>
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-blue-100/70 text-blue-700">Full</span>
                  </div>
                  <span className="block text-[10px] text-slate-400 font-mono mt-0.5 truncate">admin@vlink.com</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleFillCredentials('staff@vlink.com', 'staff123')}
                  className="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-blue-50/60 hover:border-blue-300 text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 group-hover:text-blue-600">Staff</span>
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-600">Ops</span>
                  </div>
                  <span className="block text-[10px] text-slate-400 font-mono mt-0.5 truncate">staff@vlink.com</span>
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Global Footer Positioned Cleanly at Bottom */}
        <footer className="pt-6 pb-2 text-center">
          <p className="text-xs text-slate-400 font-medium tracking-wide">
            © 2026 Created by Santhosh Kannan • VLink Networks
          </p>
        </footer>

      </main>

    </div>
  );
}
