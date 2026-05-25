import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HeartPulse, Heart, Users, Droplets, ArrowLeft, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';

export default function Auth() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, signup, googleLogin, user } = useAuth();

  // Derive active tab from the URL path
  const [isLogin, setIsLogin] = useState(location.pathname !== '/signup');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate('/feed');
  }, [user, navigate]);

  // Sync the URL when the tab changes
  const switchTo = (loginMode) => {
    setIsLogin(loginMode);
    setError('');
    setEmail('');
    setUsername('');
    setPassword('');
    setShowPassword(false);
    navigate(loginMode ? '/login' : '/signup', { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Custom client-side email format validation for Sign Up
    if (!isLogin) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email.trim() || !emailRegex.test(email.trim())) {
        setError('Please enter a valid email address (e.g., name@example.com).');
        return;
      }
    }

    setLoading(true);
    try {
      if (isLogin) {
        await login(username, password);
      } else {
        await signup(username, email, password);
      }
      navigate('/feed');
    } catch (err) {
      setError(err.response?.data?.error || (isLogin ? 'Login failed. Please check your credentials.' : 'Signup failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50 animate-fade-in-down">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-green-600 via-emerald-600 to-teal-700 flex-col justify-between p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-16 -translate-x-16" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-white/[0.03] rounded-full" />

        {/* Logo */}
        <div className="relative pl-12 z-10">
          <Link to="/" viewTransition className="flex items-center space-x-3 group">
            <div className="bg-white/20 p-2.5 rounded-xl group-hover:bg-white/30 transition-colors">
              <HeartPulse className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-black text-white">CareCommunity</span>
          </Link>
        </div>

        {/* Main text */}
        <div className="relative z-10 pl-12 space-y-8">
          <div>
            <h2 className="text-4xl font-black text-white leading-tight mb-4">
              {isLogin ? (
                <>Welcome <br />back! 👋</>
              ) : (
                <>Join our <br />community 💚</>
              )}
            </h2>
            <p className="text-green-100 text-lg leading-relaxed max-w-sm">
              {isLogin
                ? 'We\'re so glad to have you back. Your community has missed you.'
                : 'Connect with thousands of caring individuals on a mission to make healthcare more human.'}
            </p>
          </div>

          {/* Feature highlights */}
          <div className="space-y-4">
            {[
              { icon: <Users className="w-5 h-5" />, text: 'Join health-focused communities' },
              { icon: <Droplets className="w-5 h-5" />, text: 'Coordinate blood donations' },
              { icon: <Heart className="w-5 h-5" />, text: 'Share your health journey' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center space-x-3 text-green-100">
                <div className="bg-white/15 p-2 rounded-lg flex-shrink-0">
                  {item.icon}
                </div>
                <span className="text-sm font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom note */}
        <div className="relative pl-12 z-10">
          <p className="text-green-200 text-sm">
            Free to use · Community-driven · Built with 💚
          </p>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-10 lg:px-12 py-12">
        {/* Mobile back button + logo */}
        <div className="lg:hidden flex items-center justify-between mb-10">
          <Link to="/" viewTransition className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium">
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Link>
          <div className="flex items-center space-x-2">
            <div className="bg-green-100 p-1.5 rounded-lg">
              <HeartPulse className="w-5 h-5 text-green-600" />
            </div>
            <span className="font-bold text-gray-900">CareCommunity</span>
          </div>
        </div>

        <div className="max-w-md w-full mx-auto">
          {/* Tab Switcher */}
          <div className="bg-gray-100 p-1 rounded-2xl flex mb-6 sm:mb-8">
            <button
              onClick={() => switchTo(true)}
              className={`flex-1 py-2.5 sm:py-3 rounded-xl text-sm font-bold transition-all ${isLogin
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Sign In
            </button>
            <button
              onClick={() => switchTo(false)}
              className={`flex-1 py-2.5 sm:py-3 rounded-xl text-sm font-bold transition-all ${!isLogin
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Create Account
            </button>
          </div>

          {/* Heading */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2 tracking-tight">
              {isLogin ? 'Sign in to your account' : 'Create your free account'}
            </h1>
            <p className="text-gray-500 text-sm">
              {isLogin
                ? "Don't have an account? "
                : 'Already have an account? '}
              <button
                onClick={() => switchTo(!isLogin)}
                className="text-green-600 font-semibold hover:underline"
              >
                {isLogin ? 'Sign up for free' : 'Sign in here'}
              </button>
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-6 flex items-start space-x-2.5 animate-fade-in shadow-sm">
              <AlertCircle className="w-4.5 h-4.5 text-red-500 shrink-0 mt-0.5" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-0">
            <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${!isLogin ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
              <div className="overflow-hidden">
                <div className="pb-5">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    required={!isLogin}
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all text-gray-900 placeholder-gray-400 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="pb-5">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {isLogin ? 'Username or Email' : 'Username'}
                <span className={`text-xs text-gray-400 ml-2 font-normal transition-opacity duration-300 delay-100 ${!isLogin ? 'opacity-100' : 'opacity-0'}`}>(Case-sensitive)</span>
              </label>
              <input
                required
                type="text"
                placeholder={isLogin ? 'Enter your username or email' : 'Choose a username'}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all text-gray-900 placeholder-gray-400 text-sm"
              />
            </div>
            <div className="pb-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  placeholder={isLogin ? 'Enter your password' : 'Create a strong password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-4 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all text-gray-900 placeholder-gray-400 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>



            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-bold py-4 rounded-xl transition-all shadow-sm hover:shadow-md disabled:cursor-not-allowed text-sm mt-2"
            >
              {loading
                ? (isLogin ? 'Signing in...' : 'Creating account...')
                : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-50 text-gray-500">Or continue with</span>
              </div>
            </div>
            
            <div className="mt-6 flex justify-center">
              <GoogleLogin
                onSuccess={async (credentialResponse) => {
                  try {
                    await googleLogin(credentialResponse.credential);
                    navigate('/feed');
                  } catch (err) {
                    setError(err.response?.data?.error || 'Google authentication failed');
                  }
                }}
                onError={() => {
                  setError('Google Authentication Failed');
                }}
              />
            </div>
          </div>

          {/* Footer note */}
          {!isLogin && (
            <p className="text-xs text-gray-400 text-center mt-6 leading-relaxed">
              By creating an account you agree to our community guidelines and privacy policy.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
