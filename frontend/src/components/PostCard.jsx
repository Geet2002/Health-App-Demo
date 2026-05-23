import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  AlertTriangle, HelpCircle, MessageCircle, MapPin, Clock, 
  Trash2, ThumbsUp, Share2 
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

  const handleShare = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/post/${post.id}`;
    navigator.clipboard.writeText(url)
      .then(() => {
        toast.success("Post link copied to clipboard!", {
          icon: '🔗',
          style: {
            borderRadius: '16px',
            background: '#10b981',
            color: '#fff',
            fontWeight: 'bold',
          }
        });
      })
      .catch(() => {
        toast.error("Failed to copy link");
      });
  };

  return (
    <div className="relative group outline-none">
      <article className={`relative flex bg-white border rounded-2xl sm:rounded-3xl overflow-hidden transition-all duration-300 ${
        isEmergency 
          ? 'border-red-200 shadow-md shadow-red-50/50 hover:shadow-lg hover:shadow-red-100/50 hover:border-red-300' 
          : 'border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200'
      } border-l-4 ${isEmergency ? 'border-l-red-500' : 'border-l-primary-500'}`}>
        
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
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase ${
                isEmergency 
                  ? 'bg-red-100 text-red-700 animate-pulse' 
                  : 'bg-primary-50 text-primary-700 border border-primary-100'
              }`}>
                {isEmergency ? <AlertTriangle className="w-3.5 h-3.5 mr-1 text-red-600" /> : <HelpCircle className="w-3.5 h-3.5 mr-1 text-primary-500" />}
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
            <div className="flex items-center space-x-2 justify-end w-full sm:w-auto flex-shrink-0">
              
              {/* Upvote Button */}
              <button
                onClick={handleVote}
                className="flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-300 focus:outline-none bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-900 cursor-pointer active:scale-95"
                style={hasVoted ? { background: '#059669', color: '#fff' } : {}}
                title="Upvote Post"
              >
                <ThumbsUp className={`w-3.5 h-3.5 transition-transform duration-200 ${hasVoted ? 'fill-current scale-110' : ''}`} />
                <span>{votes}</span>
              </button>

              {/* Comments count */}
              <div className={`flex items-center px-3 py-1.5 rounded-full text-xs font-bold ${
                isEmergency ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-600'
              }`}>
                <MessageCircle className="w-3.5 h-3.5 mr-1" />
                <span>{post.comment_count || 0}</span>
              </div>

              {/* Share Button */}
              <button
                onClick={handleShare}
                className="p-1.5 sm:p-2 bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-800 rounded-full transition-all focus:outline-none active:scale-95 cursor-pointer"
                title="Share Post"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>

            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
