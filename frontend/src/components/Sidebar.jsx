import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  HeartPulse, PlusCircle, AlertCircle, Home, User, 
  LogOut, Users, Bell, Droplets, Image as ImageIcon 
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    if (user) {
      axios.get(`${API_URL}/notifications`, { withCredentials: true })
        .then(res => {
          if (isMounted) {
            const unread = res.data.filter(n => !n.is_read).length;
            setUnreadCount(unread);
          }
        })
        .catch(err => console.error("Failed to fetch notifications:", err));
    }
    return () => { isMounted = false; };
  }, [user]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const isActive = (path) => location.pathname === path;

  const navLinkClass = (path) => `
    flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors
    ${isActive(path) 
      ? 'bg-primary-50 text-primary-700 font-semibold' 
      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
  `;

  return (
    <aside className="w-full sm:w-64 bg-white border-r border-gray-200 sm:h-screen sticky top-0 flex flex-col z-50">
      {/* Header/Logo */}
      <div className="p-4 sm:p-6 flex items-center justify-between sm:justify-start">
        <Link to="/" className="flex items-center space-x-2 group">
          <div className="bg-primary-100 p-2 rounded-lg group-hover:bg-primary-200 transition-colors">
            <HeartPulse className="w-6 h-6 text-primary-600" />
          </div>
          <span className="text-xl font-bold bg-clip-text text-primary-600 bg-gradient-to-r from-primary-600 to-teal-600">
            CareCommunity
          </span>
        </Link>
      </div>
    
      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-2 space-y-1 sm:overflow-y-auto flex sm:flex-col justify-around sm:justify-start border-t sm:border-t-0 border-gray-200 fixed sm:static bottom-0 left-0 w-full bg-white sm:bg-transparent shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] sm:shadow-none pb-safe sm:pb-2">
        <Link to="/" className={navLinkClass('/')} title="Feed">
          <Home className="w-6 h-6 sm:w-5 sm:h-5" />
          <span className="hidden sm:inline">Feed</span>
        </Link>

        {user && (
          <>
            <Link to="/health-moments" className={navLinkClass('/health-moments')} title="Health Moments">
              <ImageIcon className="w-6 h-6 sm:w-5 sm:h-5 text-indigo-500" />
              <span className="hidden sm:inline">Moments</span>
            </Link>

            <Link to="/communities" className={navLinkClass('/communities')} title="Communities">
              <Users className="w-6 h-6 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Communities</span>
            </Link>

            <Link to="/blood-donation" className={navLinkClass('/blood-donation')} title="Blood Donation">
              <Droplets className="w-6 h-6 sm:w-5 sm:h-5 text-red-500" />
              <span className="hidden sm:inline">Blood Donation</span>
            </Link>
          
            <Link to="/notifications" className={`${navLinkClass('/notifications')} relative`} title="Notifications">
              <div className="relative">
                <Bell className="w-6 h-6 sm:w-5 sm:h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 sm:top-0 sm:right-0 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full border-2 border-white">
                    {unreadCount}
                  </span>
                )}
              </div>
              <span className="hidden sm:inline">Notifications</span>
            </Link>
          </>
        )}
      </nav>

      {/* User Actions & Create Buttons (Desktop) */}
      <div className="hidden sm:block p-4 border-t border-gray-200">
        {user ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Link to="/create?type=query" className="btn-primary w-full flex items-center justify-center space-x-2">
                <PlusCircle className="w-4 h-4" />
                <span>Ask Question</span>
              </Link>
              <Link to="/create?type=emergency" className="btn-emergency w-full flex items-center justify-center space-x-2">
                <AlertCircle className="w-4 h-4" />
                <span>Emergency Alert</span>
              </Link>
            </div>
          
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <Link to="/profile" className="flex items-center space-x-2 overflow-hidden group flex-1 hover:bg-gray-50 p-1.5 rounded-xl transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 overflow-hidden border border-gray-200">
                  {user.profile_picture ? (
                    <img src={`${API_URL.replace('/api', '')}${user.profile_picture}`} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-4 h-4 text-primary-600" />
                  )}
                </div>
                <span className="text-sm font-semibold text-gray-700 truncate group-hover:text-primary-600 transition-colors">
                  {user.username}
                </span>
              </Link>
              <button onClick={handleLogout} className="text-gray-400 hover:text-red-600 transition-colors p-2 rounded-lg hover:bg-red-50 ml-2" title="Log Out">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Link to="/login" className="block w-full text-center py-2 text-sm font-medium text-gray-700 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">Sign In</Link>
            <Link to="/signup" className="block w-full text-center text-sm font-medium bg-gray-900 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-gray-800 transition-colors">Sign Up</Link>
          </div>
        )}
      </div>

      {/* Mobile Create Buttons (Floating) */}
      {user && (
        <div className="sm:hidden fixed bottom-20 right-4 flex flex-col space-y-2 z-50">
           <Link to="/create?type=emergency" className="bg-red-600 text-white p-3 rounded-full shadow-lg">
             <AlertCircle className="w-6 h-6" />
           </Link>
           <Link to="/create?type=query" className="bg-primary-600 text-white p-3 rounded-full shadow-lg">
             <PlusCircle className="w-6 h-6" />
           </Link>
        </div>
      )}
    </aside>
  );
}