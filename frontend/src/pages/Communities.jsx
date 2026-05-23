import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Users, Lock, Unlock, Plus, Search, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const CommunityCard = ({ comm, handleQuickJoin }) => (
  <Link to={`/communities/${comm.id}`} className="block group outline-none h-full">
    <div className="bg-white border border-gray-100 p-6 h-full flex flex-col rounded-3xl transition-all duration-300 hover:border-primary-200 hover:shadow-xl shadow-sm hover:shadow-primary-100/60 transform hover:-translate-y-1 relative">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2.5 rounded-xl ${comm.is_private ? 'bg-orange-50 text-orange-600' : 'bg-primary-50 text-primary-600'}`}>
          {comm.is_private ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
        </div>
        <span className="text-xs text-gray-400 font-bold bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100">
          {formatDistanceToNow(new Date(comm.created_at))} ago
        </span>
      </div>
      
      <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary-600 transition-colors mb-3 pr-2">{comm.name}</h3>
      
      <p className="text-sm text-gray-600 line-clamp-3 mb-6 flex-grow leading-relaxed">{comm.description}</p>
      
      <div className="flex items-center justify-between pt-5 border-t border-gray-50">
        <div className="flex items-center text-sm font-bold text-gray-500">
          <Users className="w-4 h-4 mr-1.5" /> {comm.member_count || 1} Member(s)
        </div>
        
        <div className="relative z-10">
          {!comm.user_status ? (
            <button 
              onClick={(e) => handleQuickJoin(e, comm.id)} 
              className="text-sm font-bold bg-gray-50 text-primary-700 hover:bg-primary-100 hover:text-primary-800 px-4 py-2 rounded-xl transition-colors border border-gray-100"
            >
              Join
            </button>
          ) : comm.user_status === 'pending' ? (
            <span className="text-xs font-bold bg-yellow-50 text-yellow-700 px-3 py-2 rounded-xl border border-yellow-200">Pending</span>
          ) : (
            <span className="text-xs font-bold bg-green-50 text-green-700 px-3 py-2 rounded-xl flex items-center border border-green-200">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Joined
            </span>
          )}
        </div>
      </div>
    </div>
  </Link>
);

export default function Communities() {
  const [communities, setCommunities] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComms();
  }, []);

  const fetchComms = async () => {
    try {
      const res = await axios.get(`${API_URL}/communities`);
      setCommunities(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickJoin = async (e, id) => {
    e.preventDefault(); // Prevent navigating to the detail page
    e.stopPropagation(); // Prevent bubbling up to the Link component wrapper
    try {
      const res = await axios.post(`${API_URL}/communities/${id}/join`);
      toast.success(res.data.message);
      fetchComms(); // Refresh to update user_status
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error joining');
    }
  };

  const filteredCommunities = communities.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    (c.description && c.description.toLowerCase().includes(search.toLowerCase()))
  );

  const myComms = filteredCommunities.filter(c => c.user_status === 'approved');
  const otherComms = filteredCommunities.filter(c => c.user_status !== 'approved');

  if (loading) return <div className="text-center py-12">Loading...</div>;

  return (
    <div className="space-y-10 animate-fade-in pb-12">
      {/* Page Title & Create Button */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Health Communities</h1>
          <p className="text-gray-500 mt-2">Join groups or create your own safe space to connect and share.</p>
        </div>
        <Link to="/communities/create" className="btn-primary flex items-center justify-center shrink-0">
          <Plus className="w-4 h-4 mr-2" /> Create Community
        </Link>
      </div>

      {/* Search Input */}
      <div className="relative mb-6">
        <label className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
          <Search className="w-5 h-5" />
        </label>
        <input 
          type="search" 
          placeholder="Search for a community by name or description..." 
          className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-500 bg-white shadow-sm transition-all"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Section 1: My Joined Communities */}
      <div className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center px-1">
          <Users className="w-5 h-5 mr-2.5 text-primary-500 animate-pulse" />
          My Communities {myComms.length > 0 && `(${myComms.length})`}
        </h2>
        
        {myComms.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-3xl border border-dashed border-gray-200 p-6 shadow-sm">
            <Users className="mx-auto h-10 w-10 text-gray-300 mb-2" />
            <h3 className="text-sm font-bold text-gray-800">No joined communities</h3>
            <p className="mt-1 text-xs text-gray-400 max-w-sm mx-auto">You haven't joined any health groups yet. Explore the discover list below to join and participate!</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myComms.map(comm => (
              <CommunityCard key={comm.id} comm={comm} handleQuickJoin={handleQuickJoin} />
            ))}
          </div>
        )}
      </div>

      <hr className="border-gray-200/60 my-8" />

      {/* Section 2: Discover Communities */}
      <div className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center px-1">
          <Search className="w-5 h-5 mr-2.5 text-emerald-500" />
          Discover New Communities
        </h2>
        
        {otherComms.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-gray-150 p-6 shadow-sm">
            <p className="text-gray-400 font-medium">No new communities to discover at this time.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {otherComms.map(comm => (
              <CommunityCard key={comm.id} comm={comm} handleQuickJoin={handleQuickJoin} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
