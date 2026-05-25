import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, Trash2, Clock, User, Heart, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { useConfirm } from '../../context/ConfirmContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export default function AdminMomentsTab() {
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const confirm = useConfirm();

  useEffect(() => {
    fetchShares();
  }, []);

  const fetchShares = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/admin/health-shares`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShares(res.data);
    } catch (err) {
      toast.error('Failed to load moments');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Delete Moment',
      message: 'Are you sure you want to delete this health moment? This action is permanent.',
      confirmText: 'Delete',
      confirmColor: 'bg-red-600 hover:bg-red-700 text-white',
      type: 'danger'
    });
    if (!ok) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/admin/health-shares/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShares(shares.filter(share => share.id !== id));
      toast.success('Moment deleted');
    } catch (err) {
      toast.error('Failed to delete moment');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading moments...</div>;

  return (
    <div>
      <div className="mb-6 flex justify-between items-end">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <Activity className="w-6 h-6 mr-2 text-indigo-500" />
          Health Moments
        </h2>
        <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full font-medium">
          {shares.length} Moments
        </span>
      </div>

      {shares.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
          <p className="text-gray-500">No health moments found.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {shares.map(share => (
            <div key={share.id} className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between shadow-sm">
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center space-x-2 mb-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="font-bold text-gray-900 text-sm">{share.author_name}</span>
                  <span className="text-gray-400 text-xs flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {formatDistanceToNow(new Date(share.created_at), { addSuffix: true })}
                  </span>
                </div>
                
                <p className="text-gray-700 text-sm line-clamp-2">
                  {share.content || <span className="italic text-gray-400">Media only post</span>}
                </p>

                <div className="mt-3 flex items-center space-x-4 text-xs text-gray-500">
                  <span className="flex items-center"><Heart className="w-3.5 h-3.5 mr-1" /> {share.likes_count || 0}</span>
                  <span className="flex items-center"><MessageCircle className="w-3.5 h-3.5 mr-1" /> {share.comment_count || 0}</span>
                  {share.media_url && (
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 font-bold rounded-full uppercase tracking-wider text-[10px]">Contains Media</span>
                  )}
                </div>
              </div>
              <div className="mt-4 sm:mt-0 flex-shrink-0">
                <button
                  onClick={() => handleDelete(share.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  title="Delete Moment"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
