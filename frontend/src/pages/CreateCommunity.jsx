import toast from 'react-hot-toast';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Users, Shield, ArrowLeft } from 'lucide-react';

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
    <div className="max-w-xl mx-auto py-6 sm:py-8 px-4 sm:px-0 pb-32">
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-100 relative">
        <button 
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </button>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-6 flex items-center tracking-tight">
          <div className="bg-primary-50 p-2 sm:p-3 rounded-full mr-3 sm:mr-4 border border-primary-100 shadow-sm">
            <Users className="w-6 h-6 sm:w-7 sm:h-7 text-primary-600" />
          </div>
          Start a Community
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Community Name</label>
            <input required type="text" value={name} onChange={e=>setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-500 bg-gray-50 focus:bg-white text-gray-900 font-medium transition-colors"
              placeholder="e.g. Diabetics Support NYC" />
          </div>
          
          <div>
             <label className="block text-sm font-bold text-gray-700 mb-1.5">Description</label>
             <textarea rows="4" required value={description} onChange={e=>setDescription(e.target.value)}
               className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-500 bg-gray-50 focus:bg-white text-gray-900 font-medium resize-none transition-colors"
               placeholder="What is this community about?" />
          </div>

          <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors">
            <label className="flex items-start cursor-pointer">
              <input type="checkbox" checked={isPrivate} onChange={e=>setIsPrivate(e.target.checked)} className="mt-1 w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500 transition-all" />
              <div className="ml-3">
                <span className="block text-sm font-bold text-gray-900 flex items-center"><Shield className="w-4 h-4 mr-1 text-gray-500"/> Private Community</span>
                <span className="block text-sm text-gray-500 mt-1">If active, new members must be approved by admins before they can join and view content.</span>
              </div>
            </label>
          </div>

          <div className="pt-4 sm:pt-6 border-t border-gray-100 flex justify-end">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-4 py-2 sm:px-6 sm:py-2.5 text-sm font-bold text-gray-500 hover:text-gray-900 bg-transparent rounded-xl mr-2 sm:mr-3 transition-colors"
            >
              Cancel
            </button>
            <button type="submit" className="px-6 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-bold shadow-md transition-all bg-primary-600 hover:bg-primary-500 text-white focus:ring-primary-500 focus:ring-offset-primary-50 focus:outline-none focus:ring-2 focus:ring-offset-2">
              Create Community
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
