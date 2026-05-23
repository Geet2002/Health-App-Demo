import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { 
  AlertTriangle, HelpCircle, MessageCircle, MapPin, Clock, 
  Trash2, Search, PlusCircle, User, Phone, CheckCircle, ChevronRight
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

function FeedSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      {[1, 2, 3].map((n) => (
        <div key={n} className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex flex-col space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/6"></div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-5 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
          <div className="flex justify-between items-center pt-3 border-t border-gray-50">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-6 bg-gray-200 rounded w-1/6"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'global', 'communities'
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all', 'emergency', 'query'
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();
  const [userStats, setUserStats] = useState({ posts_count: 0, upvotes_count: 0 });

  const fetchUserStats = async () => {
    if (!user) return;
    try {
      const res = await axios.get(`${API_URL}/users/${user.id}/public`);
      if (res.data && res.data.stats) {
        setUserStats(res.data.stats);
      }
    } catch (err) {
      console.error("Error fetching user stats:", err);
    }
  };

  useEffect(() => {
    fetchUserStats();

    // Background polling (every 15 seconds) to fetch upvote changes from other users silently
    const interval = setInterval(() => {
      fetchUserStats();
    }, 15000);
    return () => clearInterval(interval);
  }, [user]);

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
      setUserStats(prev => ({ ...prev, posts_count: Math.max(0, prev.posts_count - 1) }));
      toast.success('Post deleted successfully');
    } catch (err) {
      toast.error('Error deleting post');
    }
  };

  // Client-side real-time filter combining search query and subcategory selection
  const filteredPosts = posts.filter(post => {
    const matchesSearch = 
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (post.author_name && post.author_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (post.community_name && post.community_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (post.location && post.location.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = categoryFilter === 'all' || post.type === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const myPostsCount = userStats.posts_count;
  const myUpvotesCount = userStats.upvotes_count;
  const reputationPoints = (myPostsCount * 10) + (myUpvotesCount * 25);

  // Determine Reputation Level
  let levelName = 'Care Supporter';
  let nextLevelPoints = 100;
  let progressPercent = 0;

  if (reputationPoints < 50) {
    levelName = 'Community Helper';
    nextLevelPoints = 50;
    progressPercent = (reputationPoints / 50) * 100;
  } else if (reputationPoints < 200) {
    levelName = 'Health Advocate';
    nextLevelPoints = 200;
    progressPercent = ((reputationPoints - 50) / 150) * 100;
  } else {
    levelName = 'Life Saver';
    nextLevelPoints = 500;
    progressPercent = Math.min((reputationPoints / 500) * 100, 100);
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Dynamic Sleek Header Box */}
      <div className="bg-white/85 backdrop-blur-md p-3.5 sm:p-5 rounded-2xl border border-gray-150 shadow-sm relative overflow-hidden mb-4 sm:mb-6">
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary-100/5 rounded-full filter blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col space-y-3 sm:space-y-4">
          
          {/* Title Row */}
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Community Feed</h1>
            <p className="hidden sm:block text-xs text-gray-500 font-medium mt-0.5">Discover medical queries, check updates, and support emergencies.</p>
          </div>

          {/* Controls Row (Side-by-Side on Desktop/Tablet) */}
          <div className="flex flex-col md:flex-row md:items-center gap-3 w-full">
            {/* Real-time search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search posts, locations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-50 border border-gray-100 text-xs sm:text-sm placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-1.5 focus:ring-primary-500 focus:bg-white transition-all shadow-inner"
              />
            </div>

            {/* Segmented Control Bar (Responsive Labels to prevent mobile wrapping) */}
            <div className="flex bg-gray-100/70 p-1 rounded-xl w-full md:w-auto md:min-w-[320px] shrink-0">
              {[
                { id: 'all', label: 'All Feeds', shortLabel: 'All' },
                { id: 'global', label: 'Global', shortLabel: 'Global' },
                { id: 'communities', label: 'My Communities', shortLabel: 'Communities' }
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition-all duration-200 ${
                    filter === f.id
                      ? 'bg-white text-primary-700 shadow-sm font-extrabold'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/30'
                  }`}
                >
                  <span className="hidden xs:inline">{f.id === 'communities' ? 'Communities' : f.label}</span>
                  <span className="xs:hidden">{f.shortLabel}</span>
                </button>
              ))}
            </div>
          </div>
          
        </div>
      </div>

      {/* Horizontal categories carousel (Optimized for Mobile scroll) */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 pt-1 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth">
        {[
          { id: 'all', label: 'All Posts', icon: null },
          { id: 'emergency', label: '🚨 Emergencies', icon: AlertTriangle },
          { id: 'query', label: '❓ Medical Queries', icon: HelpCircle }
        ].map((cat) => {
          const Icon = cat.icon;
          const isActive = categoryFilter === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 border ${
                isActive
                  ? cat.id === 'emergency'
                    ? 'bg-red-500 text-white border-red-500 shadow-sm'
                    : 'bg-primary-600 text-white border-primary-600 shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {isActive && Icon && <Icon className="w-3.5 h-3.5 mr-0.5 animate-pulse" />}
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-8">
        
        {/* Left Column (Main Feed) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Quick Post Creator Widget */}
          {user && (
            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-150 shadow-sm flex items-center space-x-3 sm:space-x-4 transition-all hover:border-gray-200">
              <Link to="/profile" className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden border border-gray-150">
                  {user.profile_picture ? (
                    <img src={`${API_URL.replace('/api', '')}${user.profile_picture}`} alt="Me" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-primary-600" />
                  )}
                </div>
              </Link>
              
              <Link 
                to="/create?type=query" 
                className="flex-1 bg-gray-50 hover:bg-gray-100/80 border border-gray-100 rounded-full px-4 py-2.5 text-xs sm:text-sm text-gray-400 font-medium transition-all text-left flex items-center min-w-0"
              >
                <span className="truncate block w-full">What's on your mind, {user.username}? Ask a health query...</span>
              </Link>

              <div className="flex items-center space-x-1.5">
                <Link to="/create?type=emergency" className="flex items-center justify-center p-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-full transition-all" title="Emergency Alert">
                  <AlertTriangle className="w-4.5 h-4.5 sm:w-5 h-5 text-red-600" />
                </Link>
                <Link to="/create?type=query" className="flex items-center justify-center p-2.5 bg-primary-50 hover:bg-primary-100 text-primary-600 rounded-full transition-all" title="Ask Question">
                  <PlusCircle className="w-4.5 h-4.5 sm:w-5 h-5 text-primary-600" />
                </Link>
              </div>
            </div>
          )}

          {/* Main Feed Content or Skeletons */}
          {loading ? (
            <FeedSkeleton />
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-300 shadow-sm p-6">
              <HelpCircle className="mx-auto h-12 w-12 text-primary-200" />
              <h3 className="mt-4 text-lg font-bold text-gray-900">No posts found</h3>
              <p className="mt-1 text-sm text-gray-500">Try adjusting your filters or searching for something else.</p>
            </div>
          ) : (
            <div className="grid gap-5">
              {filteredPosts.map((post) => (
                <PostCard key={post.id} post={post} currentUser={user} onDelete={handleDeletePost} onVote={fetchUserStats} />
              ))}
            </div>
          )}
        </div>

        {/* Right Column (Sidebar Widgets - Hidden on mobile/tablet) */}
        <div className="hidden lg:block lg:col-span-1 space-y-6">
          
          {/* Widget 1: Quick Profile Stats (Reputation & Badge Upgrades) */}
          {user && (
            <div className="bg-white rounded-3xl p-6 border border-gray-150 shadow-sm relative overflow-hidden transition-all hover:border-gray-200">
              {/* Subtle visual background glows */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary-100/10 rounded-full filter blur-xl pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-20 h-20 bg-indigo-100/5 rounded-full filter blur-lg pointer-events-none"></div>
              
              <div className="relative z-10 flex flex-col">
                {/* Profile Pic, Username, Verification check */}
                <div className="flex items-center space-x-3.5 pb-4 border-b border-gray-100">
                  <Link to="/profile" className="relative group flex-shrink-0">
                    <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden border border-primary-500 shadow-md group-hover:opacity-90 transition-opacity">
                      {user.profile_picture ? (
                        <img src={`${API_URL.replace('/api', '')}${user.profile_picture}`} alt="Me" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-6 h-6 text-primary-600" />
                      )}
                    </div>
                    {user.is_medical_professional === 1 && (
                      <span className="absolute bottom-0 right-0 bg-primary-600 text-white p-0.5 rounded-full border border-white" title="Verified Professional">
                        <CheckCircle className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-bold text-gray-900 truncate hover:text-primary-600 transition-colors">
                      <Link to="/profile">{user.username}</Link>
                    </h3>
                    {user.is_medical_professional === 1 && (
                      <p className="text-[10px] text-primary-600 font-extrabold uppercase tracking-wide truncate">
                        Verified Medical Pro
                      </p>
                    )}
                    {user.email && (
                      <p className="text-[11px] text-gray-400 font-semibold truncate mt-0.5" title={user.email}>
                        {user.email}
                      </p>
                    )}
                  </div>
                </div>

                {/* Reputation / Level progress metrics */}
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-400 uppercase tracking-wide text-[9px]">Reputation level</span>
                    <span className="font-extrabold text-primary-600 text-[10px] bg-primary-50 px-2 py-0.5 rounded-full uppercase tracking-wider">{levelName}</span>
                  </div>
                  
                  {/* Custom Progress Bar */}
                  <div className="space-y-1">
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden shadow-inner border border-gray-200/50">
                      <div className="bg-primary-500 h-full rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-bold text-gray-400">
                      <span>{reputationPoints} Points</span>
                      <span>Next Level: {nextLevelPoints} pts</span>
                    </div>
                  </div>
                </div>

                {/* Stats grid display */}
                <div className="grid grid-cols-2 gap-4 mt-4 py-3 bg-gray-50/50 rounded-2xl border border-gray-100">
                  <div className="text-center">
                    <span className="block text-lg font-black text-gray-900">{myPostsCount}</span>
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Posts Shared</span>
                  </div>
                  <div className="text-center border-l border-gray-100">
                    <span className="block text-lg font-black text-primary-600">{myUpvotesCount}</span>
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Upvotes Gained</span>
                  </div>
                </div>

                {/* Achieved community badges */}
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {user.is_medical_professional === 1 && (
                    <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-[9px] font-bold rounded-md text-indigo-600 uppercase tracking-wider">Verified Professional</span>
                  )}
                  {myPostsCount > 0 && (
                    <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-[9px] font-bold rounded-md text-emerald-600 uppercase tracking-wider">Active Contributor</span>
                  )}
                  {myUpvotesCount > 0 && (
                    <span className="px-2 py-0.5 bg-yellow-50 border border-yellow-100 text-[9px] font-bold rounded-md text-yellow-700 uppercase tracking-wider">Highly Appreciated</span>
                  )}
                </div>

                {/* Profile Shortcut Action Links */}
                <div className="mt-5 pt-4 border-t border-gray-100 flex flex-col space-y-2">
                  <Link to="/profile" className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100/50 transition-all group cursor-pointer">
                    <span className="text-xs font-bold text-gray-600 group-hover:text-gray-900 transition-colors">Manage Profile Settings</span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </Link>
                  <Link to="/communities" className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100/50 transition-all group cursor-pointer">
                    <span className="text-xs font-bold text-gray-600 group-hover:text-gray-900 transition-colors">Explore Communities</span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </Link>
                </div>
                
              </div>
            </div>
          )}

          {/* Widget 2: Active Emergencies */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
            <h3 className="text-sm sm:text-base font-extrabold text-gray-900 mb-4 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2 text-red-500 animate-pulse" />
              Active Emergencies
            </h3>
            {posts.filter(p => p.type === 'emergency').slice(0, 3).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4 bg-gray-50 rounded-2xl border border-dashed border-gray-150">No current emergencies.</p>
            ) : (
              <div className="space-y-3">
                {posts.filter(p => p.type === 'emergency').slice(0, 3).map(post => (
                  <Link key={post.id} to={`/post/${post.id}`} className="block p-3.5 rounded-2xl bg-red-50/50 hover:bg-red-50 border border-red-100/50 hover:border-red-200 transition-all group">
                    <div className="flex items-start justify-between">
                      <span className="text-[10px] font-extrabold text-red-700 uppercase tracking-wide">EMERGENCY</span>
                      <span className="text-[9px] text-gray-400 flex items-center">
                        <Clock className="w-2.5 h-2.5 mr-1" />
                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-gray-900 mt-1 truncate group-hover:text-red-600 transition-colors">{post.title}</h4>
                    {post.location && (
                      <span className="text-[11px] text-gray-500 flex items-center mt-1">
                        <MapPin className="w-3 h-3 mr-1 text-red-400" />
                        {post.location}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Widget 3: Emergency Contacts */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-full filter blur-xl -mr-6 -mt-6 pointer-events-none"></div>
            <div className="relative z-10">
              <h3 className="text-sm sm:text-base font-extrabold text-gray-900 mb-4 flex items-center">
                <Phone className="w-4 h-4 mr-2 text-red-500" />
                Emergency Helplines
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-red-50 border border-red-100">
                  <span className="text-xs font-bold text-red-800">Ambulance Services</span>
                  <span className="text-sm font-black text-red-700">102 / 108</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100">
                  <span className="text-xs font-bold text-gray-600">Police Support</span>
                  <span className="text-sm font-black text-gray-700">100</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100">
                  <span className="text-xs font-bold text-gray-600">Fire & Safety</span>
                  <span className="text-sm font-black text-gray-700">101</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
