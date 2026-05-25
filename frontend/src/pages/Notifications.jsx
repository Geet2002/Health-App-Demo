import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bell, CheckSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export default function Notifications() {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifs();
  }, []);

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
      window.dispatchEvent(new CustomEvent('notificationRead'));
    } catch(err) {
      console.error(err);
    }
  };

  if (loading) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center space-x-3 mb-8">
        <Bell className="w-8 h-8 text-primary-600" />
        <h1 className="text-3xl font-extrabold text-gray-900">Your Notifications</h1>
      </div>

      {notifs.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-200">
           <p className="text-gray-500">You're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifs.map(n => (
            <div key={n.id} className={`p-5 rounded-xl border ${n.is_read ? 'bg-white border-gray-200' : 'bg-primary-50 border-primary-200 shadow-sm'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className={`text-sm ${n.is_read ? 'text-gray-800' : 'text-gray-900 font-bold'}`}>{n.content}</p>
                  <p className="text-xs text-gray-400 mt-1">{formatDistanceToNow(new Date(n.created_at))} ago</p>
                  
                  {n.related_id && (() => {
                    let toPath = `/communities/${n.related_id}`;
                    let label = 'View Community';
                    if (n.type === 'community_event') {
                      toPath = `/communities/${n.related_id}?tab=events`;
                      label = 'View Event';
                    } else if (n.type === 'event_rsvp') {
                      toPath = `/communities/${n.related_id}?tab=events`;
                      label = 'View RSVP';
                    } else if (n.type === 'community_resource') {
                      toPath = `/communities/${n.related_id}?tab=resources`;
                      label = 'View Resource';
                    } else if (n.type === 'new_post') {
                      toPath = `/post/${n.related_id}`;
                      label = 'View Post';
                    } else if (['blood_request', 'blood_comment', 'blood_offer'].includes(n.type)) {
                      toPath = `/blood-donation/${n.related_id}`;
                      label = 'View Blood Request';
                    }
                    return (
                      <Link to={toPath} className="inline-block mt-3 text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline animate-fade-in">
                        {label}
                      </Link>
                    );
                  })()}
                </div>
                {!n.is_read && (
                  <button onClick={() => markRead(n.id)} className="text-primary-600 hover:text-primary-800 flex items-center text-xs font-semibold bg-primary-100 hover:bg-primary-200 px-2 py-1 rounded transition-colors">
                     <CheckSquare className="w-3 h-3 mr-1" /> Mark Read
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
