import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bell, CheckSquare, MessageSquare, Users, Droplet, Info, Check, Circle, ExternalLink, Trash2, CheckCheck, ArrowLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import { NotificationSkeleton } from '../components/Skeletons';
import { useAuth } from '../context/AuthContext';
import { socket } from '../socket';
import { useConfirm } from '../context/ConfirmContext';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export default function Notifications() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'unread'

  useEffect(() => {
    fetchNotifs();

    const handleNewNotif = (targetUserId) => {
      if (user && targetUserId.toString() === user.id.toString()) {
        fetchNotifs();
      }
    };
    
    socket.on('new_notification', handleNewNotif);
    return () => socket.off('new_notification', handleNewNotif);
  }, [user]);

  const fetchNotifs = async () => {
    try {
      const res = await axios.get(`${API_URL}/notifications`);
      setNotifs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (id) => {
    try {
      await axios.put(`${API_URL}/notifications/${id}/read`);
      setNotifs(notifs.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      
      // Dispatch an event so the Sidebar can instantly update its badge without reloading
      window.dispatchEvent(new CustomEvent('notificationRead', { detail: { action: 'markRead' } }));
    } catch(err) {
      console.error(err);
    }
  };

  const markAllRead = async () => {
    try {
      await axios.put(`${API_URL}/notifications/read-all`);
      setNotifs(notifs.map(n => ({ ...n, is_read: 1 })));
      window.dispatchEvent(new CustomEvent('notificationRead', { detail: { action: 'markAllRead' } })); // Badge will handle its own logic or just reset
    } catch(err) {
      console.error(err);
    }
  };

  const deleteNotif = async (id) => {
    try {
      await axios.delete(`${API_URL}/notifications/${id}`);
      setNotifs(notifs.filter(n => n.id !== id));
      window.dispatchEvent(new CustomEvent('notificationRead', { detail: { action: 'delete' } }));
    } catch(err) {
      console.error(err);
    }
  };

  const clearAll = async () => {
    const ok = await confirm({
      title: 'Clear All Notifications',
      message: 'Are you sure you want to delete all notifications? This action cannot be undone.',
      confirmText: 'Clear All',
      confirmColor: 'bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md',
      type: 'danger'
    });
    if (!ok) return;
    
    try {
      await axios.delete(`${API_URL}/notifications`);
      setNotifs([]);
      window.dispatchEvent(new CustomEvent('notificationRead', { detail: { action: 'clearAll' } }));
    } catch(err) {
      console.error(err);
    }
  };

  const getIconForType = (type) => {
    if (!type) return <Info className="w-5 h-5 text-gray-400" />;
    if (type.includes('community') || type.includes('event') || type.includes('role')) return <Users className="w-5 h-5 text-indigo-500" />;
    if (type.includes('post')) return <MessageSquare className="w-5 h-5 text-primary-500" />;
    if (type.includes('blood')) return <Droplet className="w-5 h-5 text-red-500" />;
    return <Info className="w-5 h-5 text-gray-500" />;
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 pb-32 px-4 sm:px-6 pt-0 sm:pt-8">
        <div className="flex flex-row items-center justify-between gap-4 mb-2 sm:mb-6 mt-2 sm:mt-0">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button onClick={() => navigate(-1)} className="p-2 sm:-ml-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400">
               <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <div className="bg-gray-100 rounded-xl sm:rounded-2xl shrink-0 w-8 h-8 sm:w-12 sm:h-12 animate-pulse"></div>
            <div className="h-6 sm:h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
          </div>
        </div>
        <NotificationSkeleton />
      </div>
    );
  }

  const filteredNotifs = notifs.filter(n => filter === 'all' ? true : !n.is_read);

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in pb-32 px-4 sm:px-6 pt-0 sm:pt-8">
      <div className="flex flex-row items-center justify-between gap-4 mb-2 sm:mb-6 mt-2 sm:mt-0">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <button onClick={() => navigate(-1)} className="p-2 sm:-ml-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-900" title="Go Back">
             <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <div className="bg-primary-100 p-1.5 sm:p-2.5 rounded-xl sm:rounded-2xl shrink-0">
            <Bell className="w-5 h-5 sm:w-8 sm:h-8 text-primary-600" />
          </div>
          <h1 className="text-xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Notifications</h1>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={markAllRead} 
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-bold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            <span className="hidden sm:inline">Mark All Read</span>
          </button>
          <button 
            onClick={clearAll} 
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-bold text-red-600 hover:text-white hover:bg-red-600 bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Clear All</span>
          </button>
        </div>
      </div>

      <div className="flex space-x-1 bg-gray-100/80 p-0.5 rounded-lg w-full sm:w-64 mb-4">
        <button
          onClick={() => setFilter('all')}
          className={`flex-1 py-1.5 text-[13px] font-bold rounded-md transition-colors ${filter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`flex-1 py-1.5 text-[13px] font-bold rounded-md transition-colors flex items-center justify-center space-x-1.5 ${filter === 'unread' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <span>Unread</span>
          {notifs.some(n => !n.is_read) && (
            <span className="w-2 h-2 rounded-full bg-primary-500"></span>
          )}
        </button>
      </div>

      {filteredNotifs.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-300 shadow-sm"
        >
           <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
           <p className="text-gray-500 text-lg font-medium">{filter === 'unread' ? 'No unread notifications!' : 'You\'re all caught up!'}</p>
        </motion.div>
      ) : (
        <motion.div layout="position" className="space-y-3">
          <AnimatePresence mode="popLayout" initial={false}>
            {filteredNotifs.map(n => (
              <motion.div 
                key={n.id} 
                layout="position"
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, x: -20 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className={`group relative p-4 sm:p-5 rounded-2xl border transition-colors ${n.is_read ? 'bg-white border-gray-100 hover:border-gray-200 shadow-sm hover:shadow' : 'bg-primary-50/50 border-primary-200 shadow hover:shadow-md'}`}
              >
              <div className="flex gap-4">
                <div className="shrink-0 mt-1">
                  <div className={`p-2.5 rounded-full ${n.is_read ? 'bg-gray-50' : 'bg-white shadow-sm'}`}>
                    {getIconForType(n.type)}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <p className={`text-sm sm:text-base leading-snug ${n.is_read ? 'text-gray-700' : 'text-gray-900 font-bold'}`}>{n.content}</p>
                      <p className="text-xs text-gray-500 mt-1.5 font-medium">{formatDistanceToNow(new Date(n.created_at))} ago</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {!n.is_read && (
                        <button 
                          onClick={() => markRead(n.id)} 
                          className="shrink-0 p-1.5 text-primary-600 hover:text-white hover:bg-primary-600 bg-primary-100 rounded-full transition-colors tooltip-trigger"
                          title="Mark as Read"
                        >
                           <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                      )}
                      <button 
                        onClick={() => deleteNotif(n.id)} 
                        className="shrink-0 p-1.5 text-red-500 hover:text-white hover:bg-red-500 bg-red-50 rounded-full transition-colors"
                        title="Delete Notification"
                      >
                         <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    </div>
                  </div>
                  
                  {n.related_id && (() => {
                    let toPath = `/communities/${n.related_id}`;
                    let label = 'View Details';
                    if (n.type === 'community_event') {
                      toPath = `/communities/${n.related_id}?tab=events`;
                    } else if (n.type === 'event_rsvp') {
                      toPath = `/communities/${n.related_id}?tab=events`;
                    } else if (n.type === 'community_resource') {
                      toPath = `/communities/${n.related_id}?tab=resources`;
                    } else if (n.type === 'new_post') {
                      toPath = `/post/${n.related_id}`;
                    } else if (['blood_request', 'blood_comment', 'blood_offer'].includes(n.type)) {
                      toPath = `/blood-donation/${n.related_id}`;
                    }
                    return (
                      <Link to={toPath} className="inline-flex items-center mt-3 text-sm font-bold text-primary-600 hover:text-primary-800 bg-white border border-primary-100 px-3 py-1.5 rounded-lg shadow-sm hover:shadow transition-all">
                        {label} <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                      </Link>
                    );
                  })()}
                </div>
              </div>
            </motion.div>
          ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
