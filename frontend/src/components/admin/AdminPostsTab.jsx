import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Trash2, FileText, MessageSquare, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfirm } from '../../context/ConfirmContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export default function AdminPostsTab() {
  const confirm = useConfirm();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/posts`);
      setPosts(res.data);
    } catch (err) {
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const isConfirmed = await confirm({
      title: 'Delete Post?',
      message: 'Are you sure you want to delete this post permanently? This action cannot be undone.',
      confirmText: 'Delete Post',
      type: 'danger'
    });
    if (!isConfirmed) return;
    try {
      await axios.delete(`${API_URL}/admin/posts/${id}`);
      toast.success('Post deleted');
      setPosts(posts.filter(p => p.id !== id));
    } catch (err) {
      toast.error('Failed to delete post');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading posts...</div>;

  const filteredPosts = posts.filter(p => 
    (p.title && p.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.author_name && p.author_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.content && p.content.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Post Moderation</h2>
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:min-w-[280px]">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Search by title, author, or content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-sm"
            />
          </div>
          <span className="text-sm text-gray-500 bg-gray-100 px-3 py-2 rounded-xl font-medium whitespace-nowrap hidden sm:block">
            {filteredPosts.length} Posts
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {filteredPosts.map(post => (
          <div key={post.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:border-gray-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                  post.type === 'emergency' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {post.type}
                </span>
                {post.community_name && (
                  <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full truncate max-w-[150px]">
                    c/{post.community_name}
                  </span>
                )}
                <span className="text-xs text-gray-400">• By {post.author_name}</span>
              </div>
              <h3 className="font-semibold text-gray-900 truncate">{post.title}</h3>
              <p className="text-sm text-gray-600 line-clamp-1 mt-1">{post.content}</p>
              <div className="text-xs text-gray-400 mt-2 flex items-center space-x-2">
                <span>{new Date(post.created_at).toLocaleString()}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2 self-start sm:self-center shrink-0">
              <a 
                href={`/post/${post.id}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-200"
                title="View Post"
              >
                <FileText className="w-4 h-4" />
              </a>
              <button 
                onClick={() => handleDelete(post.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
                title="Delete Post"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {filteredPosts.length === 0 && (
          <div className="bg-white p-8 rounded-2xl border border-gray-200 text-center text-gray-500">
            No posts found.
          </div>
        )}
      </div>
    </div>
  );
}
