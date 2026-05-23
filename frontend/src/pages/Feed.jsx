import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AlertTriangle, HelpCircle, MessageCircle, MapPin, Clock, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'global', 'communities'
  const { user } = useAuth();

  useEffect(() => {
    fetchPosts();
  }, [filter]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/posts?filter=${filter}`);
      setPosts(response.data);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    if(!window.confirm('Delete this post?')) return;
    try {
      await axios.delete(`${API_URL}/posts/${id}`);
      setPosts(posts.filter(p => p.id !== id));
    } catch (err) {
      toast.error('Error deleting post');
    }
  };

  if (loading && posts.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-50 mb-8 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Community Feed</h1>
            <p className="text-gray-500 mt-2 text-lg">Discover queries and assist with health emergencies.</p>
          </div>
          
          <div className="mt-6 md:mt-0 flex bg-gray-100 p-1 rounded-xl w-full md:w-auto">
            {['all', 'global', 'communities'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 md:flex-none px-4 py-2 text-sm font-semibold rounded-lg capitalize transition-all ${filter === f ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {f === 'communities' ? 'My Communities' : f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-300 shadow-sm">
          <HelpCircle className="mx-auto h-12 w-12 text-primary-200" />
          <h3 className="mt-4 text-lg font-bold text-gray-900">No posts yet</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by asking a question or reporting an emergency!</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} currentUser={user} onDelete={handleDeletePost} />
          ))}
        </div>
      )}
    </div>
  );
}
