import toast from 'react-hot-toast';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { 
  AlertTriangle, HelpCircle, MessageCircle, MapPin, Clock, 
  Trash2, Search, PlusCircle, User, Phone, CheckCircle, ChevronRight,
  Activity, Stethoscope
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { socket } from '../socket';
import PostCard from '../components/PostCard';
import PageHeader from '../components/PageHeader';
import { PostSkeleton } from '../components/Skeletons';
import CreatePost from './CreatePost';
import { motion, AnimatePresence } from 'framer-motion';

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
  const confirm = useConfirm();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'global', 'communities'
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all', 'emergency', 'query'
  const [searchQuery, setSearchQuery] = useState('');
  
  // Infinite scroll state
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const observer = useRef();
  const { user } = useAuth();
  const [userStats, setUserStats] = useState({ posts_count: 0, upvotes_count: 0 });
  const [hasNewPosts, setHasNewPosts] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createModalType, setCreateModalType] = useState('query');
  const [editingPost, setEditingPost] = useState(null);

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

    const handleGlobalFeedUpdate = (data) => {
      if (data?.action === 'add' && data?.triggerUserId !== user?.id) {
        setHasNewPosts(true);
      } else {
        // Fallback for generic updates
        fetchPosts(0, false, true);
      }
    };
    
    const handlePostUpdate = () => {
      fetchPosts(0, false, true);
    };
    
    socket.on('global_feed_updated', handleGlobalFeedUpdate);
    socket.on('post_updated', handlePostUpdate);
    socket.on('comment_updated', handlePostUpdate);

    return () => {
      clearInterval(interval);
      socket.off('global_feed_updated', handleGlobalFeedUpdate);
      socket.off('post_updated', handlePostUpdate);
      socket.off('comment_updated', handlePostUpdate);
    };
  }, [user]);

  // Reset feed when filters change
  useEffect(() => {
    setPage(0);
    setHasMore(true);
    setPosts([]);
    fetchPosts(0, false);
  }, [filter, searchQuery, categoryFilter]);

  const fetchPosts = async (pageNum = 0, isLoadMore = false, silent = false) => {
    if (isLoadMore) setLoadingMore(true);
    else if (!silent) setLoading(true);

    try {
      const limit = 10;
      const offset = pageNum * limit;
      const response = await axios.get(`${API_URL}/posts?filter=${filter}&category=${categoryFilter}&search=${searchQuery}&limit=${limit}&offset=${offset}`);
      
      if (isLoadMore) {
        setPosts(prev => {
          // Prevent duplicates on strict mode dev environments
          const newPosts = response.data.posts.filter(np => !prev.some(p => p.id === np.id));
          return [...prev, ...newPosts];
        });
      } else {
        setPosts(response.data.posts);
      }
      setHasMore(response.data.hasMore);
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      if (isLoadMore) setLoadingMore(false);
      else if (!silent) setLoading(false);
    }
  };

  const lastPostElementRef = useCallback(node => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        fetchPosts(page + 1, true);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore, page, filter, searchQuery, categoryFilter]);

  const handlePostCreated = async () => {
    setShowCreateModal(false);
    await fetchPosts(0, false, true);
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  const handleDeletePost = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    const ok = await confirm({
      title: 'Delete Post',
      message: 'Are you sure you want to delete this post? This will permanently remove its contents and comments.',
      confirmText: 'Delete Post',
      confirmColor: 'bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md',
      type: 'danger'
    });
    if (!ok) return;

    try {
      await axios.delete(`${API_URL}/posts/${id}`);
      setPosts(posts.filter(p => p.id !== id));
      setUserStats(prev => ({ ...prev, posts_count: Math.max(0, prev.posts_count - 1) }));
      toast.success('Post deleted successfully');
    } catch (err) {
      toast.error('Error deleting post');
    }
  };

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
      <PageHeader 
        title="Community Feed"
        description="Discover medical queries, check updates, and support emergencies."
      >
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
      </PageHeader>

      {/* Horizontal categories carousel (Optimized for Mobile scroll) */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 pt-1 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth">
        {[
          { id: 'all', label: 'All Posts', icon: null },
          { id: 'emergency', label: 'Emergencies', icon: null },
          { id: 'query', label: 'Queries', icon: null }
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
              {Icon && <Icon className={`w-3.5 h-3.5 ${isActive ? 'animate-pulse' : cat.id === 'emergency' ? 'text-red-500' : 'text-primary-500'}`} />}
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main 2-Column Responsive Layout */}
      <div className={`grid grid-cols-1 ${user?.is_admin ? '' : 'md:grid-cols-3 md:gap-6 lg:gap-8'}`}>
        
        {/* Left Column (Main Feed) */}
        <div className={`${user?.is_admin ? '' : 'md:col-span-2'} space-y-6 relative`}>
          
          {/* Quick Post Creator Widget */}
          {user && !user.is_admin && (
            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-150 shadow-sm flex items-center space-x-3 sm:space-x-4 transition-all hover:border-gray-200">
              <Link to="/profile" className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden border border-gray-150">
                  {user.profile_picture ? (
                    <img src={user.profile_picture.startsWith('http') ? user.profile_picture : `${API_URL.replace('/api', '')}${user.profile_picture}?token=${localStorage.getItem('token')}`} alt="Me" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-primary-600" />
                  )}
                </div>
              </Link>
              
              <button 
                onClick={() => { setCreateModalType('query'); setShowCreateModal(true); }}
                className="flex-1 bg-gray-50 hover:bg-gray-100/80 border border-gray-100 rounded-full px-4 py-2.5 text-xs sm:text-sm text-gray-400 font-medium transition-all text-left flex items-center min-w-0"
              >
                <span className="truncate block w-full">What's on your mind, {user.username}? Ask a health query...</span>
              </button>

              <div className="flex items-center space-x-1.5">
                <button 
                  onClick={() => { setCreateModalType('emergency'); setShowCreateModal(true); }} 
                  className="flex items-center justify-center p-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-full transition-all" 
                  title="Emergency Alert"
                >
                  <AlertTriangle className="w-4.5 h-4.5 sm:w-5 h-5 text-red-600" />
                </button>
                <button 
                  onClick={() => { setCreateModalType('query'); setShowCreateModal(true); }} 
                  className="flex items-center justify-center p-2.5 bg-primary-50 hover:bg-primary-100 text-primary-600 rounded-full transition-all" 
                  title="Ask Question"
                >
                  <PlusCircle className="w-4.5 h-4.5 sm:w-5 h-5 text-primary-600" />
                </button>
              </div>
            </div>
          )}

          {/* New Posts Bubble Below Search/Creator */}
          {hasNewPosts && (
            <div className="flex justify-center z-30 sticky top-24 -my-2 pointer-events-none">
              <button 
                onClick={() => { setHasNewPosts(false); fetchPosts(0, false, true); window.scrollTo({top: 0, behavior: 'smooth'}); }}
                className="bg-primary-600 text-white px-4 py-1.5 rounded-full shadow-lg text-sm font-bold flex items-center animate-bounce hover:bg-primary-700 transition-colors pointer-events-auto"
              >
                ↑ New Posts
              </button>
            </div>
          )}

          {/* Main Feed Content or Skeletons */}
          {loading && posts.length === 0 ? (
            <FeedSkeleton />
          ) : posts.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-gray-150 shadow-sm text-center">
              <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">No posts found</h3>
              <p className="text-gray-500 text-sm">Be the first to create a post in this category!</p>
            </div>
          ) : (
            <motion.div layout="position" className="space-y-4">
              <AnimatePresence mode="popLayout" initial={false}>
                {posts.map((post, index) => {
                  const isLast = posts.length === index + 1;
                  return (
                    <motion.div 
                      key={post.id}
                      ref={isLast ? lastPostElementRef : null}
                      layout="position"
                      initial={{ opacity: 0, scale: 0.9, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, x: -20 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    >
                      <PostCard 
                        post={post} 
                        currentUser={user} 
                        onDelete={handleDeletePost}
                        onEdit={(p) => setEditingPost(p)}
                        onVote={fetchUserStats}
                      />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {loadingMore && (
                <div className="pt-4 pb-8 flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Right Column (Sidebar Widgets - Hidden on mobile) */}
        {!user?.is_admin && (
          <div className="hidden md:block md:col-span-1 space-y-6">
          
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
                        <img src={user.profile_picture.startsWith('http') ? user.profile_picture : `${API_URL.replace('/api', '')}${user.profile_picture}?token=${localStorage.getItem('token')}`} alt="Me" className="w-full h-full object-cover" />
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
                {!user.is_admin && (
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
                )}

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
        )}

      </div>
      
      {showCreateModal && (
        <CreatePost 
          isModal={true} 
          initialType={createModalType} 
          onClose={(success) => {
            setShowCreateModal(false);
            if (success) {
              setPage(0);
              fetchPosts(0, false);
            }
          }} 
        />
      )}
      
      {editingPost && (
        <CreatePost 
          isModal={true} 
          editingPost={editingPost}
          onClose={(success) => {
            setEditingPost(null);
            if (success) {
              setPage(0);
              fetchPosts(0, false);
            }
          }} 
        />
      )}
    </div>
  );
}
