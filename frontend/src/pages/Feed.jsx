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
  const { user } = useAuth();

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await axios.get(`${API_URL}/posts`);
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
      alert('Error deleting post');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-300 rounded-full blur-3xl opacity-20 -mr-20 -mt-20 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-200 rounded-full blur-3xl opacity-20 -ml-20 -mb-20 pointer-events-none"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Community Feed</h1>
          <p className="text-gray-500 mt-2 text-lg">Discover queries and assist with health emergencies.</p>
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
