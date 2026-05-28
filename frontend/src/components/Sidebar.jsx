import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  HeartPulse, PlusCircle, AlertCircle, Home, User, 
  LogOut, Users, Bell, Droplets, Image as ImageIcon, Shield, AlertTriangle
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import CreatePost from '../pages/CreatePost';
import { socket } from '../socket';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export default function Sidebar({ isOpen, setIsOpen }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createModalType, setCreateModalType] = useState('query');

  const communityMatch = location.pathname.match(/^\/communities\/(\d+)/);
  const currentCommunityId = communityMatch ? communityMatch[1] : null;

  useEffect(() => {
    let isMounted = true;
    
    const fetchUnreadCount = () => {
      if (!user) return;
      axios.get(`${API_URL}/notifications`)
        .then(res => {
          if (isMounted) {
            const unread = res.data.filter(n => !n.is_read).length;
            setUnreadCount(unread);
          }
        })
        .catch(err => console.error("Failed to fetch notifications:", err));
    };

    fetchUnreadCount();
    
    // Listener for when notifications are read, deleted, or cleared
    const handleNotificationUpdate = (e) => {
      if (e && e.detail) {
        const action = e.detail.action;
        if (action === 'markRead' || action === 'delete') {
          if (isMounted) setUnreadCount(prev => Math.max(0, prev - 1));
          return;
        } else if (action === 'markAllRead' || action === 'clearAll') {
          if (isMounted) setUnreadCount(0);
          return;
        }
      }
      
      // Fallback
      fetchUnreadCount();
    };
    
    const handleNewNotif = (targetUserId) => {
      if (user && targetUserId.toString() === user.id.toString()) {
        if (isMounted) setUnreadCount(prev => prev + 1);
      }
    };

    window.addEventListener('notificationRead', handleNotificationUpdate);
    socket.on('new_notification', handleNewNotif);
    
    return () => { 
      isMounted = false; 
      window.removeEventListener('notificationRead', handleNotificationUpdate);
      socket.off('new_notification', handleNewNotif);
    };
  }, [user]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  const navLinkClass = (path) => `
    flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors
    ${isActive(path) 
      ? 'bg-primary-50 text-primary-700 font-semibold' 
      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
  `;

  return (
    <>
    <aside className="w-full sm:w-64 bg-white border-r border-gray-200 sm:h-screen sticky top-0 flex flex-col z-50">
      {/* Header/Logo */}
      <div className="p-4 sm:p-6 flex items-center justify-between sm:justify-start w-full gap-3">
        <Link to="/feed" className="flex items-center space-x-2 group">
          <div className="bg-primary-100 p-1.5 sm:p-2 rounded-lg group-hover:bg-primary-200 transition-colors">
            <HeartPulse className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" />
          </div>
          <span className="text-xl font-bold bg-clip-text text-primary-600 bg-gradient-to-r from-primary-600 to-teal-600">
            CareCommunity
          </span>
        </Link>
        {user && (
          <div className="sm:hidden flex items-center gap-5 ml-auto">
            <Link to="/notifications" className="relative text-gray-600 hover:text-primary-600 transition-colors">
              <Bell className="w-6 h-6" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full border-2 border-white">
                  {unreadCount}
                </span>
              )}
            </Link>
            <Link to="/profile" className="shrink-0">
               <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden ring-2 ring-primary-500 ring-offset-2 shadow-sm">
                  {user.profile_picture ? (
                    <img src={user.profile_picture.startsWith('http') ? user.profile_picture : `${API_URL.replace('/api', '')}${user.profile_picture}`} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-primary-600" />
                  )}
               </div>
            </Link>
          </div>
        )}
      </div>
    
      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-2 space-y-1 sm:overflow-y-auto flex sm:flex-col justify-around sm:justify-start border-t sm:border-t-0 border-gray-200 fixed sm:static bottom-0 left-0 w-full bg-white sm:bg-transparent shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] sm:shadow-none pb-safe sm:pb-2">
        <Link to="/feed" className={navLinkClass('/feed')} title="Feed">
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

            {!user.is_admin && (
              <Link to="/blood-donation" className={navLinkClass('/blood-donation')} title="Blood Donation">
                <Droplets className="w-6 h-6 sm:w-5 sm:h-5 text-red-500" />
                <span className="hidden sm:inline">Blood Donation</span>
              </Link>
            )}
          
            <Link to="/notifications" className={`${navLinkClass('/notifications')} hidden sm:flex`} title="Notifications">
              <div className="relative">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full border-2 border-white">
                    {unreadCount}
                  </span>
                )}
              </div>
              <span className="hidden sm:inline">Notifications</span>
            </Link>

            <Link to="/profile" className={`${navLinkClass('/profile')} sm:hidden`} title="Profile">
              <User className="w-6 h-6" />
            </Link>

            {user.is_admin ? (
              <Link to="/admin" className={navLinkClass('/admin')} title="Admin Panel">
                <Shield className="w-6 h-6 sm:w-5 sm:h-5 text-purple-600" />
                <span className="hidden sm:inline">Admin Panel</span>
              </Link>
            ) : null}
          </>
        )}
      </nav>

      {/* User Actions & Create Buttons (Desktop) */}
      <div className="hidden sm:block p-4 border-t border-gray-200">
        {user ? (
          <div className="space-y-4">
            {!user.is_admin && (
              <div className="space-y-3 pt-2">
                <button 
                  onClick={() => { setCreateModalType('query'); setShowCreateModal(true); if (setIsOpen) setIsOpen(false); }} 
                  className="btn-primary w-full flex items-center justify-center space-x-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Ask a Query</span>
                </button>
                <button 
                  onClick={() => { setCreateModalType('emergency'); setShowCreateModal(true); if (setIsOpen) setIsOpen(false); }} 
                  className="btn-emergency w-full flex items-center justify-center space-x-2"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Report Emergency</span>
                </button>
              </div>
            )}
          
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <Link to="/profile" className="flex items-center space-x-2 overflow-hidden group flex-1 hover:bg-gray-50 p-1.5 rounded-xl transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 overflow-hidden ring-2 ring-primary-500 ring-offset-2 shadow-sm group-hover:ring-primary-600 transition-all">
                  {user.profile_picture ? (
                    <img src={user.profile_picture.startsWith('http') ? user.profile_picture : `${API_URL.replace('/api', '')}${user.profile_picture}`} alt="Profile" className="w-full h-full object-cover" />
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
      {user && !user.is_admin && (
        <div className="lg:hidden fixed bottom-24 right-4 sm:right-6 z-[60] flex flex-col space-y-3">
           <button 
             onClick={() => { setCreateModalType('emergency'); setShowCreateModal(true); }} 
             className="bg-red-600 text-white p-3 rounded-full shadow-lg"
           >
             <AlertTriangle className="w-6 h-6" />
           </button>
           <button 
             onClick={() => { setCreateModalType('query'); setShowCreateModal(true); }} 
             className="bg-primary-600 text-white p-3 rounded-full shadow-lg"
           >
             <PlusCircle className="w-6 h-6" />
           </button>
        </div>
      )}

      {/* Global Create Post Modal */}
      {showCreateModal && (
        <CreatePost 
          isModal={true} 
          initialType={createModalType} 
          communityIdProp={currentCommunityId}
          onClose={() => setShowCreateModal(false)} 
        />
      )}
    </aside>
    </>
  );
}