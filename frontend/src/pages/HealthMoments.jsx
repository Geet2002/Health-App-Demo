import toast from 'react-hot-toast';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { Heart, ThumbsDown, MessageCircle, Share2, Image as ImageIcon, Video, Mic, Send, X, Trash2, Edit2, ShieldCheck, Search } from 'lucide-react';
import Avatar from '../components/Avatar';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import MedicalBadge from '../components/MedicalBadge';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import useSpeechToText from '../hooks/useSpeechToText';
import { socket } from '../socket';
import { MomentSkeleton } from '../components/Skeletons';
import PageHeader from '../components/PageHeader';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export default function HealthMoments() {
  const confirm = useConfirm();
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [hasNewMoments, setHasNewMoments] = useState(false);

  // Pagination & Search States
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const observer = useRef();

  // New Post State
  const [content, setContent] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [isPosting, setIsPosting] = useState(false);
  const fileInputRef = useRef(null);

  // Edit State
  const [editingShareId, setEditingShareId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [editMediaFile, setEditMediaFile] = useState(null);
  const [editMediaPreview, setEditMediaPreview] = useState(null);
  const [editRemoveMedia, setEditRemoveMedia] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const editFileInputRef = useRef(null);

  const [speechLang, setSpeechLang] = useState('en-US');
  const {
    isListening,
    isTranscribing,
    transcript,
    error: speechError,
    startListening,
    stopListening
  } = useSpeechToText(speechLang);

  useEffect(() => {
    if (transcript) setContent((prev) => prev + (prev ? ' ' : '') + transcript);
  }, [transcript]);

  useEffect(() => {
    if (speechError) toast.error(speechError);
  }, [speechError]);

  // Comments State
  const [activeCommentId, setActiveCommentId] = useState(null);
  const [comments, setComments] = useState({});
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    setPage(0);
    setHasMore(true);
    setShares([]);
    fetchShares(0, false);
  }, [searchQuery]);

  useEffect(() => {
    const handleUpdate = async (id) => {
      if (typeof id === 'number' || typeof id === 'string') {
        try {
          const res = await axios.get(`${API_URL}/health-shares/${id}`);
          setShares(prev => prev.map(s => s.id === Number(id) ? res.data : s));
        } catch (err) {
          console.error('Failed to update single share', err);
        }
      } else {
        fetchShares(0, false, true);
      }
    };
    
    const handleAdd = (data) => {
      if (data?.action === 'add' && data?.triggerUserId !== user?.id) {
        setHasNewMoments(true);
      }
    };

    socket.on('health_share_updated', handleUpdate);
    socket.on('health_share_added', handleAdd);
    return () => {
      socket.off('health_share_updated', handleUpdate);
      socket.off('health_share_added', handleAdd);
    };
  }, [user]);

  const fetchShares = async (pageNum = 0, isLoadMore = false, silent = false) => {
    if (isLoadMore) setLoadingMore(true);
    else if (!silent) setLoading(true);

    try {
      const limit = 10;
      const offset = pageNum * limit;
      const res = await axios.get(`${API_URL}/health-shares?limit=${limit}&offset=${offset}&search=${searchQuery}`);
      
      if (isLoadMore) {
        setShares(prev => {
          const newShares = res.data.shares.filter(ns => !prev.some(s => s.id === ns.id));
          return [...prev, ...newShares];
        });
      } else {
        setShares(res.data.shares);
      }
      setHasMore(res.data.hasMore);
      setPage(pageNum);
    } catch (err) {
      console.error(err);
    } finally {
      if (isLoadMore) setLoadingMore(false);
      else if (!silent) setLoading(false);
    }
  };

  const lastShareElementRef = useCallback(node => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        fetchShares(page + 1, true);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore, page, searchQuery]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setMediaFile(file);
      setMediaPreview(URL.createObjectURL(file));
    }
  };

  const clearMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const clearEditMedia = () => {
    setEditMediaFile(null);
    setEditMediaPreview(null);
    setEditRemoveMedia(true);
    if (editFileInputRef.current) editFileInputRef.current.value = '';
  };

  const handleEditFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setEditMediaFile(file);
      setEditMediaPreview(URL.createObjectURL(file));
      setEditRemoveMedia(false);
    }
  };

  const handleEditShare = (share) => {
    setEditingShareId(share.id);
    setEditContent(share.content || '');
    if (share.media_url) {
      setEditMediaPreview(`${API_URL.replace('/api', '')}${share.media_url}`);
    } else {
      setEditMediaPreview(null);
    }
    setEditMediaFile(null);
    setEditRemoveMedia(false);
  };

  const handlePost = async (e) => {
    e.preventDefault();
    if (!content.trim() && !mediaFile) return;

    setIsPosting(true);
    const formData = new FormData();
    formData.append('content', content);
    if (mediaFile) formData.append('media', mediaFile);

    try {
      await axios.post(`${API_URL}/health-shares`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Share posted');
      setContent('');
      clearMedia();
      setPage(0);
      await fetchShares(0, false, true);
    } catch (err) {
      toast.error('Error posting share');
    } finally {
      setIsPosting(false);
    }
  };

  const handleSaveEdit = async (shareId) => {
    const share = shares.find(s => s.id === shareId);
    if (!editContent.trim() && !editMediaFile && !(share.media_url && !editRemoveMedia)) return;

    setIsSavingEdit(true);
    const formData = new FormData();
    formData.append('content', editContent);
    if (editMediaFile) formData.append('media', editMediaFile);
    if (editRemoveMedia) formData.append('remove_media', 'true');

    try {
      await axios.put(`${API_URL}/health-shares/${shareId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Share updated');
      setEditingShareId(null);
      fetchShares(0, false, true);
    } catch (err) {
      toast.error('Error updating share');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Delete Share',
      message: 'Are you sure you want to delete this health share post? This action is permanent and cannot be undone.',
      confirmText: 'Delete Post',
      confirmColor: 'bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md',
      type: 'danger'
    });
    if (!ok) return;

    try {
      await axios.delete(`${API_URL}/health-shares/${id}`);
      setShares(shares.filter(s => s.id !== id));
      toast.success('Share deleted successfully');
    } catch (err) {
      toast.error('Error deleting');
    }
  };

  const handleVote = async (id, voteType) => {
    try {
      await axios.post(`${API_URL}/health-shares/${id}/vote`, { vote_type: voteType });
    } catch (err) {
      console.error(err);
    }
  };

  const fetchComments = async (shareId) => {
    if (activeCommentId === shareId) {
      setActiveCommentId(null); // Toggle off
      return;
    }
    try {
      const res = await axios.get(`${API_URL}/health-shares/${shareId}/comments`);
      setComments({ ...comments, [shareId]: res.data });
      setActiveCommentId(shareId);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePostComment = async (e, shareId) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      await axios.post(`${API_URL}/health-shares/${shareId}/comments`, { content: newComment });
      setNewComment('');
      // Refresh comments for this post
      const res = await axios.get(`${API_URL}/health-shares/${shareId}/comments`);
      setComments({ ...comments, [shareId]: res.data });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteComment = async (shareId, commentId) => {
    const ok = await confirm({
      title: 'Delete Comment',
      message: 'Are you sure you want to delete this comment? This action is permanent.',
      confirmText: 'Delete',
      confirmColor: 'bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md',
      type: 'danger'
    });
    if (!ok) return;

    try {
      await axios.delete(`${API_URL}/health-share-comments/${commentId}`);
      // Refresh comments
      const res = await axios.get(`${API_URL}/health-shares/${shareId}/comments`);
      setComments({ ...comments, [shareId]: res.data });
      toast.success('Comment deleted successfully');
    } catch (err) {
      console.error(err);
      toast.error('Error deleting comment');
    }
  };

  const renderMedia = (share) => {
    if (!share.media_url) return null;
    const url = `${API_URL.replace('/api', '')}${share.media_url}`;

    if (share.media_type === 'image') {
      return <img src={url} alt="Post media" className="w-full h-auto max-h-[600px] object-cover" loading="lazy" />;
    } else if (share.media_type === 'video') {
      return <video src={url} controls className="w-full h-auto max-h-[600px] bg-black" />;
    } else if (share.media_type === 'audio') {
      return (
        <div className="p-6 bg-primary-50">
          <audio src={url} controls className="w-full" />
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-8 pb-12">
        <div className="mb-4 sm:mb-8">
          <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mt-2 animate-pulse hidden sm:block"></div>
        </div>
        <MomentSkeleton />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in pb-12 relative">
      {/* Bubble moved below search bar */}
      
      <PageHeader 
        title={user?.is_admin ? 'Health Moments (Admin View)' : 'Health Moments'}
        description={user?.is_admin ? 'Monitor public health moments and community updates.' : 'Share your journey, photos, and voice with the community.'}
        bgColor="bg-indigo-100/20"
      >
        {(user?.is_admin === 1 || user?.is_admin === true) ? (
          <div className="flex items-center text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-2xl p-4 shadow-sm mt-4">
            <ShieldCheck className="w-6 h-6 mr-3" />
            <span className="font-semibold text-sm">You are viewing the public feed with administrator privileges. You cannot create new moments.</span>
          </div>
        ) : (
          <div className="pt-2 mt-2 sm:pt-4 sm:mt-4 border-t border-gray-100/50">
            <form onSubmit={handlePost}>
          <div className="flex space-x-3">
            <div className="w-9 h-9">
              <Avatar src={user?.profile_picture} name={user?.username} size="w-9 h-9" />
            </div>
            <div className="flex-1">
              <textarea 
                className="w-full bg-transparent resize-none border-none focus:ring-0 text-base placeholder-gray-400 p-1 mt-1"
                rows="1"
                placeholder="Share your health moment..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
              
              {mediaPreview && (
                <div className="relative mt-4 rounded-xl overflow-hidden bg-gray-100 inline-block max-w-full">
                  <button type="button" onClick={clearMedia} className="absolute top-2 right-2 p-1 bg-gray-900/50 text-white rounded-full hover:bg-gray-900 transition">
                    <X className="w-4 h-4" />
                  </button>
                  { (mediaFile?.type?.startsWith('image/') || (!mediaFile && editingShare?.media_type === 'image')) ? (
                    <img src={mediaPreview} alt="Preview" className="max-h-64 object-contain" />
                  ) : (mediaFile?.type?.startsWith('video/') || (!mediaFile && editingShare?.media_type === 'video')) ? (
                    <video src={mediaPreview} className="max-h-64 object-contain" />
                  ) : (
                    <div className="p-4 flex items-center text-primary-600 font-medium">
                      <Mic className="w-5 h-5 mr-2" /> Audio Attached
                    </div>
                  )}
                </div>
              )}

              <div className="mt-2 pt-2 border-t border-gray-50 flex flex-row items-center justify-between">
                <div className="flex space-x-1 text-primary-600 items-center">
                  <button type="button" onClick={() => fileInputRef.current.click()} className="p-1.5 hover:bg-primary-50 rounded-full transition tooltip-trigger">
                    <ImageIcon className="w-5 h-5" />
                  </button>
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,video/*,audio/*" />

                  <button 
                    type="button" 
                    onClick={isListening ? stopListening : startListening} 
                    className={`p-1.5 rounded-full transition ${isListening || isTranscribing ? 'bg-red-100 text-red-600 animate-pulse' : 'hover:bg-primary-50'}`}
                  >
                    <Mic className="w-5 h-5" />
                  </button>

                  <select
                    className="text-xs sm:text-sm bg-transparent border-none text-gray-500 focus:ring-0 cursor-pointer p-0 pr-4"
                    value={speechLang}
                    onChange={(e) => setSpeechLang(e.target.value)}
                    disabled={isListening || isTranscribing}
                  >
                    <option value="en-US">English</option>
                    <option value="as-IN">Assamese</option>
                    <option value="hi-IN">Hindi</option>
                  </select>
                </div>
                
                <button 
                  type="submit" 
                  disabled={isPosting || isListening || isTranscribing || (!content.trim() && !mediaFile)}
                  className="bg-primary-600 hover:bg-primary-700 text-white px-4 sm:px-5 py-1.5 text-sm rounded-full font-bold shadow-sm transition-colors disabled:opacity-50"
                >
                  {isPosting ? 'Posting...' : isTranscribing ? 'Transcribing...' : isListening ? 'Listening...' : 'Share'}
                </button>
              </div>
            </div>
          </div>
            </form>
          </div>
        )}
      </PageHeader>

      {/* Search Bar */}
      <div className="relative z-10">
        <Search className="w-5 h-5 absolute left-4 top-3.5 text-gray-400" />
        <input
          type="text"
          placeholder="Search moments by content or author..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl focus:ring-2 focus:ring-primary-500 outline-none shadow-sm transition-all text-gray-700"
        />
      </div>

      {/* Feed */}
      <div className="space-y-8 relative">
        {hasNewMoments && (
          <div className="flex justify-center z-30 sticky top-24 -my-4 pointer-events-none">
            <button 
              onClick={() => { setHasNewMoments(false); fetchShares(0, false, true); window.scrollTo({top: 0, behavior: 'smooth'}); }}
              className="bg-primary-600 text-white px-4 py-1.5 rounded-full shadow-lg text-sm font-bold flex items-center animate-bounce hover:bg-primary-700 transition-colors pointer-events-auto"
            >
              ↑ New Moments
            </button>
          </div>
        )}
        {shares.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-300">
            <p className="text-gray-500">No moments shared yet. Be the first!</p>
          </div>
        ) : (
          <motion.div layout="position" className="space-y-8 relative">
            <AnimatePresence mode="popLayout" initial={false}>
            {shares.map((share, index) => {
              const isLastShare = index === shares.length - 1;
              return (
              <motion.div 
                key={share.id} 
                ref={isLastShare ? lastShareElementRef : null}
                layout="position"
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, x: -20 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden"
              >
              {/* Header */}
              <div className="p-4 sm:p-6 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10">
                    <Link to={`/user/${share.author_id}`} className="hover:opacity-80 transition-opacity">
                      <Avatar src={share.author_profile_picture} name={share.author_name} size="w-10 h-10" />
                    </Link>
                  </div>
                  <div>
                  <div className="flex items-center">
                    <Link to={`/user/${share.author_id}`} className="font-bold text-gray-900 hover:text-primary-600 transition-colors">
                      {share.author_name}
                    </Link>
                    <MedicalBadge isMedicalProfessional={share.is_medical_professional} />
                  </div>
                    <p className="text-xs text-gray-500">{formatDistanceToNow(new Date(share.created_at))} ago</p>
                  </div>
                </div>
                {(user && user.id === share.author_id) || user?.is_admin === 1 || user?.is_admin === true ? (
                  <div className="flex space-x-1">
                    <button onClick={() => handleEditShare(share)} className="text-gray-400 hover:text-primary-600 p-2 rounded-full hover:bg-primary-50 transition">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(share.id)} className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : null}
              </div>

              {editingShareId === share.id ? (
                <div className="px-4 sm:px-6 pb-4">
                  <textarea 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-[15px] focus:ring-2 focus:ring-primary-500 outline-none resize-y min-h-[100px]"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    placeholder="Edit your health moment..."
                  />
                  
                  {editMediaPreview && (
                    <div className="relative mt-3 rounded-xl overflow-hidden bg-gray-100 inline-block max-w-full">
                      <button type="button" onClick={clearEditMedia} className="absolute top-2 right-2 p-1.5 bg-gray-900/50 text-white rounded-full hover:bg-gray-900 transition">
                        <X className="w-4 h-4" />
                      </button>
                      {(editMediaFile?.type?.startsWith('image/') || (!editMediaFile && share.media_type === 'image')) ? (
                        <img src={editMediaPreview} alt="Preview" className="max-h-64 object-contain" />
                      ) : (editMediaFile?.type?.startsWith('video/') || (!editMediaFile && share.media_type === 'video')) ? (
                        <video src={editMediaPreview} className="max-h-64 object-contain" />
                      ) : (
                        <div className="p-4 flex items-center text-primary-600 font-medium">
                          <Mic className="w-5 h-5 mr-2" /> Audio Attached
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center space-x-2">
                      <button type="button" onClick={() => editFileInputRef.current.click()} className="p-2 text-primary-600 hover:bg-primary-50 rounded-full transition">
                        <ImageIcon className="w-5 h-5" />
                      </button>
                      <input type="file" ref={editFileInputRef} onChange={handleEditFileChange} className="hidden" accept="image/*,video/*,audio/*" />
                    </div>
                    <div className="flex space-x-2">
                      <button 
                        type="button" 
                        onClick={() => { setEditingShareId(null); clearEditMedia(); }}
                        className="text-gray-500 hover:text-gray-700 px-4 py-1.5 text-sm font-bold transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => handleSaveEdit(share.id)}
                        disabled={isSavingEdit || (!editContent.trim() && !editMediaFile && !(share.media_url && !editRemoveMedia))}
                        className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-1.5 text-sm rounded-full font-bold shadow-sm transition-colors disabled:opacity-50"
                      >
                        {isSavingEdit ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Content Text */}
                  {share.content && (
                    <div className="px-4 sm:px-6 pb-4 text-gray-800 text-[15px] leading-relaxed whitespace-pre-wrap">
                      {share.content}
                    </div>
                  )}

                  {/* Media */}
                  {renderMedia(share)}
                </>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50 px-6 pb-4">
                <div className="flex space-x-4">
                  {user?.is_admin === 1 || user?.is_admin === true ? (
                    <>
                      <div className="flex items-center space-x-1.5 text-gray-400">
                        <Heart className="w-5 h-5" />
                        <span className="font-medium text-sm">{share.likes_count || 0}</span>
                      </div>
                      <div className="flex items-center space-x-1.5 text-gray-400">
                        <ThumbsDown className="w-5 h-5" />
                        <span className="font-medium text-sm">{share.dislikes_count || 0}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <button 
                        onClick={() => handleVote(share.id, share.user_vote === 'like' ? null : 'like')} 
                        className={`flex items-center space-x-1.5 transition-colors ${share.user_vote === 'like' ? 'text-primary-600' : 'text-gray-500 hover:text-primary-600'}`}
                      >
                        <Heart className={`w-5 h-5 ${share.user_vote === 'like' ? 'fill-current' : ''}`} />
                        <span className="font-medium text-sm">{share.likes_count || 0}</span>
                      </button>
                      
                      <button 
                        onClick={() => handleVote(share.id, share.user_vote === 'dislike' ? null : 'dislike')} 
                        className={`flex items-center space-x-1.5 transition-colors ${share.user_vote === 'dislike' ? 'text-red-600' : 'text-gray-500 hover:text-red-600'}`}
                      >
                        <ThumbsDown className={`w-5 h-5 ${share.user_vote === 'dislike' ? 'fill-current' : ''}`} />
                        <span className="font-medium text-sm">{share.dislikes_count || 0}</span>
                      </button>
                    </>
                  )}
                  
                  <button 
                    onClick={() => fetchComments(share.id)} 
                    className={`flex items-center space-x-1.5 transition-colors ${activeCommentId === share.id ? 'text-primary-600' : 'text-gray-500 hover:text-primary-600'}`}
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span className="font-medium text-sm">{share.comment_count || 0}</span>
                  </button>
                </div>
                
                <button className="text-gray-500 hover:text-primary-600 transition">
                  <Share2 className="w-6 h-6" />
                </button>
              </div>

              {/* Comments Section */}
              {activeCommentId === share.id && (
                <div className="bg-gray-50 p-4 sm:px-6 border-t border-gray-100">
                  <div className="space-y-4 mb-4 max-h-64 overflow-y-auto pr-2">
                    {comments[share.id]?.length === 0 ? (
                      <p className="text-center text-sm text-gray-500 py-2">No comments yet.</p>
                    ) : (
                      comments[share.id]?.map(comment => (
                        <div key={comment.id} className="flex space-x-3 group relative">
                           <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-xs shrink-0 overflow-hidden">
                            <Link to={`/user/${comment.author_id}`} className="w-full h-full flex items-center justify-center hover:bg-gray-300 transition-colors">
                              {comment.author_profile_picture ? (
                                <img src={comment.author_profile_picture.startsWith('http') ? comment.author_profile_picture : `http://localhost:5001${comment.author_profile_picture}`} alt="" className="w-full h-full object-cover" />
                              ) : (
                                comment.author_name?.[0]?.toUpperCase()
                              )}
                            </Link>
                          </div>
                          <div className="bg-white px-4 py-2.5 rounded-2xl rounded-tl-sm shadow-sm text-sm border border-gray-100 flex-1 relative">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <Link to={`/user/${comment.author_id}`} className="font-bold text-gray-900 mr-2 hover:text-primary-600 transition-colors">
                                  {comment.author_name}
                                </Link>
                                <MedicalBadge isMedicalProfessional={comment.is_medical_professional} className="w-3.5 h-3.5 mr-2 text-blue-600" />
                                <span className="text-xs text-gray-500">{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}</span>
                              </div>
                              {user && (user.id === comment.author_id || user.is_admin === 1 || user.is_admin === true) && (
                                <button 
                                  onClick={() => handleDeleteComment(share.id, comment.id)}
                                  className="text-gray-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity rounded-full hover:bg-red-50"
                                  title="Delete comment"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                            <span className="text-gray-700 block mt-1">{comment.content}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  
                  {/* New Comment Input */}
                  {(user?.is_admin !== 1 && user?.is_admin !== true) && (
                    <form onSubmit={(e) => handlePostComment(e, share.id)} className="flex mt-4 gap-2">
                      <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Write a comment..."
                        className="flex-1 bg-white border border-gray-200 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                      />
                      <button type="submit" disabled={!newComment.trim()} className="p-2 text-white bg-primary-600 rounded-full hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm">
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  )}
                  </div>
                )}
              </motion.div>
              );
            })}
            </AnimatePresence>
          </motion.div>
        )}
        
        {loadingMore && (
          <div className="flex justify-center py-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        )}
      </div>

    </div>
  );
}
