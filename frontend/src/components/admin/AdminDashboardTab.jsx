import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, FileText, Share2, Droplets, Activity } from 'lucide-react';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export default function AdminDashboardTab({ setActiveTab }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/stats`);
      setStats(res.data);
    } catch (err) {
      toast.error('Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500 animate-pulse">Loading dashboard...</div>;
  if (!stats) return null;

  const statCards = [
    { label: 'Total Users', value: stats.users, icon: Users, color: 'bg-blue-500', bg: 'bg-blue-50', tabId: 'users' },
    { label: 'Total Posts', value: stats.posts, icon: FileText, color: 'bg-indigo-500', bg: 'bg-indigo-50', tabId: 'posts' },
    { label: 'Communities', value: stats.communities, icon: Share2, color: 'bg-purple-500', bg: 'bg-purple-50', tabId: 'communities' },
    { label: 'Blood Requests', value: stats.bloodRequests, icon: Droplets, color: 'bg-red-500', bg: 'bg-red-50', tabId: 'blood-requests' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 mb-6">
        <Activity className="w-6 h-6 text-primary-600" />
        <h2 className="text-2xl font-bold text-gray-800">Overview</h2>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div 
              key={idx} 
              onClick={() => setActiveTab && card.tabId ? setActiveTab(card.tabId) : null}
              className={`${card.bg} rounded-2xl p-6 shadow-sm border border-white/50 backdrop-blur-xl hover:shadow-md transition-all relative overflow-hidden group cursor-pointer hover:scale-[1.02] active:scale-[0.98]`}
            >
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 rounded-full bg-white opacity-40 blur-2xl"></div>
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">{card.label}</p>
                  <h3 className="text-3xl font-bold text-gray-900">{card.value}</h3>
                </div>
                <div className={`${card.color} text-white p-3 rounded-xl shadow-lg`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
