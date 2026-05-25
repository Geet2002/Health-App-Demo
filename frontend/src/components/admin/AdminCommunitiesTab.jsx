import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Trash2, Users } from 'lucide-react';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export default function AdminCommunitiesTab() {
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCommunities();
  }, []);

  const fetchCommunities = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/communities`);
      setCommunities(res.data);
    } catch (err) {
      toast.error('Failed to load communities');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this community permanently? All related posts and members will be lost.')) return;
    try {
      await axios.delete(`${API_URL}/admin/communities/${id}`);
      toast.success('Community deleted');
      setCommunities(communities.filter(c => c.id !== id));
    } catch (err) {
      toast.error('Failed to delete community');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading communities...</div>;

  return (
    <div>
      <div className="mb-6 flex justify-between items-end">
        <h2 className="text-2xl font-bold text-gray-800">Community Moderation</h2>
        <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full font-medium">
          {communities.length} Communities
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {communities.map(community => (
          <div key={community.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:border-gray-300 transition-colors flex flex-col h-full">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-bold text-lg text-gray-900 truncate pr-4">{community.name}</h3>
              <div className="flex items-center space-x-2 shrink-0">
                <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                  community.is_private ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {community.is_private ? 'Private' : 'Public'}
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-600 line-clamp-2 mb-4 flex-1">
              {community.description || 'No description provided.'}
            </p>
            <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
              <div className="text-xs text-gray-500 flex flex-col space-y-1">
                <span>Created by <span className="font-medium text-gray-700">{community.creator_name}</span></span>
                <span>{new Date(community.created_at).toLocaleDateString()}</span>
              </div>
              <button 
                onClick={() => handleDelete(community.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
                title="Delete Community"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
        {communities.length === 0 && (
          <div className="col-span-1 md:col-span-2 bg-white p-8 rounded-2xl border border-gray-200 text-center text-gray-500">
            No communities found.
          </div>
        )}
      </div>
    </div>
  );
}
