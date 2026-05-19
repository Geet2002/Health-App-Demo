import toast from 'react-hot-toast';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Users, Shield } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export default function CreateCommunity() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/communities`, { name, description, is_private: isPrivate });
      navigate(`/communities/${res.data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error creating community');
    }
  };

  return (
    <div className="max-w-xl mx-auto py-8">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-6 flex items-center">
          <Users className="mr-3 w-8 h-8 text-primary-500" /> Start a Community
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Community Name</label>
            <input required type="text" value={name} onChange={e=>setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-500 bg-gray-50 focus:bg-white"
              placeholder="e.g. Diabetics Support NYC" />
          </div>
          
          <div>
             <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
             <textarea rows="4" required value={description} onChange={e=>setDescription(e.target.value)}
               className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-500 bg-gray-50 focus:bg-white resize-none"
               placeholder="What is this community about?" />
          </div>

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <label className="flex items-start cursor-pointer">
              <input type="checkbox" checked={isPrivate} onChange={e=>setIsPrivate(e.target.checked)} className="mt-1 w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500" />
              <div className="ml-3">
                <span className="block text-sm font-bold text-gray-900 flex items-center"><Shield className="w-4 h-4 mr-1 text-gray-500"/> Private Community</span>
                <span className="block text-sm text-gray-500 mt-1">If active, new members must be approved by admins before they can join and view content.</span>
              </div>
            </label>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <button type="submit" className="w-full btn-primary py-3 text-lg">Create Community</button>
          </div>
        </form>
      </div>
    </div>
  );
}
