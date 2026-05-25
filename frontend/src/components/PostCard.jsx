import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, HelpCircle, MessageCircle, MapPin, Clock, 
  Trash2, ThumbsUp, Share2, Copy, X
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Avatar from './Avatar';
import { formatDistanceToNow } from 'date-fns';
import MedicalBadge from './MedicalBadge';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const formatLocationText = (loc) => {
  if (!loc) return '';
  if (loc.includes('||')) {
    const parts = loc.split('||');
    const latlngPart = parts[0].trim();
    const addressPart = parts[1].trim();

    if (addressPart && /[a-zA-Z]/.test(addressPart)) {
      return addressPart;
    }
    if (latlngPart && /[a-zA-Z]/.test(latlngPart)) {
      return latlngPart;
    }
    return cleanCoordinates(latlngPart);
  }
  return cleanCoordinates(loc);
};

const cleanCoordinates = (str) => {
  const regex = /^(-?\d+\.\d+),\s*(-?\d+\.\d+)$/;
  const match = str.match(regex);
  if (match) {
    const lat = parseFloat(match[1]).toFixed(4);
    const lng = parseFloat(match[2]).toFixed(4);
    return `${lat}, ${lng}`;
  }
  return str;
};

export default function PostCard({ post, currentUser, onDelete, onVote, hideCommunityName = false }) {
  const isOwner = currentUser && post.author_id === currentUser.id;
  const isEmergency = post.type === 'emergency';

  const [votes, setVotes] = useState(post.vote_count || 0);
  const [hasVoted, setHasVoted] = useState(post.user_vote === 'like');
  const [isVoting, setIsVoting] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const shareMenuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    setHasVoted(post.user_vote === 'upvote' || post.user_vote === 'like');
    setVotes(post.vote_count || 0);
  }, [post.user_vote, post.vote_count]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target)) {
        setShowShareMenu(false);
      }
    };
    if (showShareMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showShareMenu]);

  const handleVote = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUser) {
      toast.error("Please sign in to upvote");
      return;
    }
    if (isVoting) return;

    // Optimistic UI updates
    const originalVotes = votes;
    const originalHasVoted = hasVoted;
    setVotes(prev => hasVoted ? prev - 1 : prev + 1);
    setHasVoted(!hasVoted);
    setIsVoting(true);

    try {
      const res = await axios.post(`${API_URL}/posts/${post.id}/vote`);
      setVotes(res.data.vote_count);
      setHasVoted(res.data.user_vote === 'like');
      if (onVote) {
        onVote();
      }
    } catch (err) {
      console.error(err);
      // Rollback on error
      setVotes(originalVotes);
      setHasVoted(originalHasVoted);
      toast.error("Failed to record vote");
    } finally {
      setIsVoting(false);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSubmittingComment(true);
    try {
      await axios.post(`${API_URL}/posts/${post.id}/comments`, { content: newComment });
      toast.success('Comment added successfully!');
      setNewComment('');
      setShowCommentInput(false);
      navigate(`/post/${post.id}`);
    } catch (err) {
      toast.error('Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const toggleShareMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowShareMenu(prev => !prev);
  };

  const shareToPlatform = (e, platform) => {
    e.preventDefault();
    e.stopPropagation();
    
    const url = `${window.location.origin}/post/${post.id}`;
    const text = `Check out this post: ${post.title}`;
    
    setShowShareMenu(false);

    if (platform === 'copy') {
      navigator.clipboard.writeText(url).then(() => {
        toast.success("Link copied to clipboard!", { icon: '🔗' });
      }).catch(() => toast.error("Failed to copy link"));
      return;
    }

    if (platform === 'whatsapp') {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
      return;
    }

    if (platform === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
      return;
    }

    if (platform === 'x') {
      window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
      return;
    }

    if (platform === 'instagram') {
      navigator.clipboard.writeText(url).then(() => {
        toast.success("Link copied! Open Instagram to share.", { icon: '📸' });
        setTimeout(() => window.open('https://instagram.com', '_blank'), 1500);
      });
      return;
    }
  };

  return (
    <div className="relative group outline-none">
      <article className={`relative flex border rounded-2xl sm:rounded-3xl transition-all duration-300 ${
        isEmergency 
          ? 'bg-red-50/40 border-red-200 shadow-sm hover:shadow-md hover:border-red-300' 
          : 'bg-white border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200'
      }`}>
        
        {/* Full card clickable link overlay (non-interactive areas pass clicks through via pointer-events-none) */}
        <Link to={`/post/${post.id}`} className="absolute inset-0 z-10 cursor-pointer" aria-label="View post details"></Link>

        <div className="p-4 sm:p-6 flex-1 relative z-20 flex flex-col pointer-events-none">
          
          {/* Header Row */}
          <div className="flex items-start justify-between mb-4 pointer-events-auto relative z-30">
            <div className="flex items-center space-x-3">
              <Link to={`/user/${post.author_id}`} className="flex-shrink-0 hover:opacity-85 transition-opacity">
                <Avatar src={post.author_profile_picture} name={post.author_name} size="w-11 h-11" />
              </Link>
              <div>
                <Link to={`/user/${post.author_id}`} className="text-sm font-bold text-gray-900 flex items-center hover:text-primary-600 transition-colors">
                  {post.author_name || 'Anonymous User'}
                  <MedicalBadge isMedicalProfessional={post.is_medical_professional} />
                </Link>
                <div className="text-[11px] text-gray-400 font-semibold flex items-center mt-0.5">
                  <Clock className="w-3.5 h-3.5 mr-1" />
                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                </div>
              </div>
            </div>

            {/* Badges and Delete Actions */}
            <div className="flex items-center space-x-2">
              <span className={`inline-flex items-center text-[10px] font-extrabold tracking-widest uppercase ${
                isEmergency ? 'px-2 py-0.5 rounded-md bg-red-100 text-red-600 animate-pulse' : 'text-gray-400'
              }`}>
                {isEmergency ? <AlertTriangle className="w-3.5 h-3.5 mr-1" /> : <HelpCircle className="w-3.5 h-3.5 mr-1" />}
                {isEmergency ? 'Emergency' : 'Query'}
              </span>

              {isOwner && (
                <button 
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete && onDelete(e, post.id); }} 
                  className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-full transition-all cursor-pointer" 
                  title="Delete Post"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Post Title */}
          <h3 className={`text-lg sm:text-xl font-extrabold mb-2 leading-tight ${isEmergency ? 'text-red-700' : 'text-gray-900'}`}>
            {post.title}
          </h3>

          {/* Post Content Snippet */}
          <p className="text-gray-600 text-xs sm:text-sm mb-4 line-clamp-3 leading-relaxed">
            {post.content}
          </p>

          {/* Actions & Meta Data Row */}
          <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:items-center sm:justify-between mt-auto pt-3.5 border-t border-gray-50 relative z-30 pointer-events-auto">
            <div className="flex items-center text-xs text-gray-500 flex-wrap gap-2 w-full sm:w-auto">
              {post.community_name && !hideCommunityName && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-50 text-gray-600 border border-gray-150">
                  {post.community_name}
                </span>
              )}

              {post.location && (
                <span className="flex items-center text-gray-500 font-medium">
                  <MapPin className="w-3.5 h-3.5 mr-1 text-primary-500" />
                  <span className="text-xs truncate max-w-[200px] sm:max-w-xs" title={post.location}>
                    {formatLocationText(post.location)}
                  </span>
                </span>
              )}
            </div>

            {/* Interactive action buttons */}
            <div className="flex items-center space-x-1 justify-end w-full sm:w-auto flex-shrink-0">
              
              {/* Upvote Button / Count */}
              {currentUser?.is_admin === 1 || currentUser?.is_admin === true ? (
                <div className="flex items-center justify-center space-x-1.5 px-2 py-1.5 text-xs font-bold text-gray-500">
                  <ThumbsUp className="w-4 h-4" />
                  <span>{votes}</span>
                </div>
              ) : (
                <button
                  onClick={handleVote}
                  className={`flex items-center justify-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors focus:outline-none cursor-pointer ${
                    hasVoted ? 'text-primary-600 bg-primary-50' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  title="Upvote Post"
                >
                  <ThumbsUp className={`w-4 h-4 ${hasVoted ? 'fill-current' : ''}`} />
                  <span>{votes}</span>
                </button>
              )}

              {/* Comments count / Toggle input */}
              {currentUser?.is_admin === 1 || currentUser?.is_admin === true ? (
                <div className="flex items-center px-2 py-1.5 text-xs font-bold text-gray-500">
                  <MessageCircle className="w-4 h-4 mr-1.5" />
                  <span>{post.comment_count || 0}</span>
                </div>
              ) : (
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowCommentInput(!showCommentInput); }}
                  className="flex items-center px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors focus:outline-none cursor-pointer text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                  title="Add a comment"
                >
                  <MessageCircle className="w-4 h-4 mr-1.5" />
                  <span>{post.comment_count || 0}</span>
                </button>
              )}

              {/* Share Button with Expandable Menu */}
              <div className="relative" ref={shareMenuRef}>
                <button
                  onClick={toggleShareMenu}
                  className={`p-1.5 sm:p-2 rounded-lg transition-colors focus:outline-none cursor-pointer ${showShareMenu ? 'text-primary-600 bg-primary-50' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'}`}
                  title="Share Post"
                >
                  <Share2 className="w-4 h-4" />
                </button>

                {/* Popover Menu Expanding Towards Top */}
                {showShareMenu && (
                  <div className="absolute bottom-full right-0 mb-2 bg-white border border-gray-100 shadow-xl rounded-xl p-1.5 flex flex-col gap-1 z-[100] min-w-[140px] animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <button onClick={(e) => shareToPlatform(e, 'whatsapp')} className="flex items-center w-full px-3 py-2 text-xs font-medium text-gray-700 hover:bg-[#25D366]/10 hover:text-[#25D366] rounded-lg transition-colors">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                      WhatsApp
                    </button>
                    <button onClick={(e) => shareToPlatform(e, 'x')} className="flex items-center w-full px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 hover:text-black rounded-lg transition-colors">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                      X (Twitter)
                    </button>
                    <button onClick={(e) => shareToPlatform(e, 'instagram')} className="flex items-center w-full px-3 py-2 text-xs font-medium text-gray-700 hover:bg-[#E1306C]/10 hover:text-[#E1306C] rounded-lg transition-colors">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                      Instagram
                    </button>
                    <button onClick={(e) => shareToPlatform(e, 'facebook')} className="flex items-center w-full px-3 py-2 text-xs font-medium text-gray-700 hover:bg-[#1877F2]/10 hover:text-[#1877F2] rounded-lg transition-colors">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                      Facebook
                    </button>
                    <div className="h-px bg-gray-100 my-1"></div>
                    <button onClick={(e) => shareToPlatform(e, 'copy')} className="flex items-center w-full px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Link
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </article>

      {/* Inline Comment Input */}
      {showCommentInput && (
        <div className="mt-3 relative z-30 animate-fade-in bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
          <form onSubmit={handleCommentSubmit} className="flex flex-col space-y-2">
            <textarea
              autoFocus
              className="w-full bg-gray-50 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 border border-gray-200 resize-none transition-all"
              rows="2"
              placeholder="Write a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />
            <div className="flex justify-end space-x-2">
              <button 
                type="button" 
                onClick={() => setShowCommentInput(false)}
                className="px-4 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={!newComment.trim() || submittingComment}
                className="px-4 py-1.5 text-xs font-bold text-white bg-primary-600 hover:bg-primary-500 rounded-lg shadow-sm disabled:opacity-50 transition-colors"
              >
                {submittingComment ? 'Posting...' : 'Post'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
