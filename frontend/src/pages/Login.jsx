import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HeartPulse } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await login(username, password);
      navigate('/feed');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen w-full py-12 px-4 sm:px-6 lg:px-8 bg-primary-50/50">
      <div className="flex bg-white shadow-2xl rounded-3xl overflow-hidden max-w-4xl w-full min-h-[550px] animate-fade-in-up">
        {/* Left Side - Green Panel */}
        <div className="w-1/2 bg-gradient-to-br from-primary-500 to-primary-700 text-white p-12 flex flex-col justify-center items-center text-center hidden sm:flex relative rounded-r-[100px] z-10 shadow-[10px_0_30px_-10px_rgba(0,0,0,0.3)]">
          <div className="absolute top-8 left-8 flex items-center space-x-2">
            <HeartPulse className="w-8 h-8 text-white" />
            <span className="text-xl font-bold text-white tracking-tight">CareCommunity</span>
          </div>

          <h2 className="text-4xl font-bold mb-4 mt-8">Hello, Friend!</h2>
          <p className="text-sm text-primary-100 mb-8 max-w-[80%] leading-relaxed">
            Enter your personal details and start your journey with us
          </p>
          <Link 
            to="/signup" 
            className="border-2 border-white text-white font-bold py-2.5 px-10 rounded-full hover:bg-white hover:text-primary-600 transition-colors uppercase tracking-wider text-sm"
          >
            Sign Up
          </Link>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full sm:w-1/2 p-8 sm:p-14 flex flex-col justify-center bg-white items-center text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-8">Sign in</h2>

          {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg w-full mb-6 border border-red-200 text-sm">{error}</div>}

          <form onSubmit={handleLogin} className="space-y-4 w-full max-w-sm">
            <div>
              <input 
                required
                type="text" 
                className="w-full px-5 py-3.5 rounded-md bg-gray-100 border-transparent focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all text-gray-800 placeholder-gray-400"
                placeholder="Username"
                value={username} onChange={(e) => setUsername(e.target.value)} 
              />
            </div>
            <div>
              <input 
                required
                type="password" 
                className="w-full px-5 py-3.5 rounded-md bg-gray-100 border-transparent focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all text-gray-800 placeholder-gray-400"
                placeholder="Password"
                value={password} onChange={(e) => setPassword(e.target.value)} 
              />
            </div>

            <p className="text-sm text-gray-500 text-right w-full cursor-pointer hover:text-primary-600 mt-2 mb-6">
              Forgot your password?
            </p>

            <button type="submit" className="w-48 mx-auto bg-primary-600 hover:bg-primary-700 text-white font-bold py-3.5 rounded-full shadow-lg transition-colors uppercase tracking-wider text-sm mt-4">
              Sign In
            </button>
          </form>
          
          <p className="text-sm text-gray-500 mt-8 sm:hidden">
            Don't have an account? <Link to="/signup" className="text-primary-600 font-bold hover:underline">Sign Up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
