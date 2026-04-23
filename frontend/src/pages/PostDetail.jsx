import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle, HelpCircle, MapPin, Send, ArrowLeft, User, Clock, Trash2, ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { MapContainer, Marker } from 'react-leaflet';
import VectorTileLayer from '../components/VectorTileLayer';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const CommentItem = ({ comment, allComments, user, onReply, onDelete, onVote, depth = 0 }) => {
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  
  const replies = allComments.filter(c => c.parent_id === comment.id);
  
  const handleReplySubmit = () => {
    if (!replyText.trim()) return;
    onReply(comment.id, replyText);
    setReplyText('');
    setShowReply(false);
  };

  return (
    <div className={`mt-4 ${depth > 0 ? 'ml-4 sm:ml-8 border-l-2 border-gray-100 pl-4' : ''}`}>
      <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-gray-100 transition-shadow hover:shadow-md">
        <div className="flex items-start space-x-3">
          <div className="bg-primary-50 p-2 rounded-full hidden sm:block">
            <User className="w-4 h-4 text-primary-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-gray-900 text-sm">{comment.author_name || 'Community Member'}</span>
              <div className="flex items-center space-x-3">
                <span className="text-xs text-gray-400">
                  {comment.created_at ? formatDistanceToNow(new Date(comment.created_at), { addSuffix: true }) : 'Just now'}
                </span>
                {user && comment.author_id === user.id && (
                  <button onClick={() => onDelete(comment.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1">
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
            <p className="text-gray-700 whitespace-pre-line text-sm mb-3">{comment.content}</p>
            
            <div className="flex items-center space-x-4 text-xs font-medium text-gray-500">
              <button onClick={() => onVote(comment.id, 'like')} className={`flex items-center space-x-1 hover:text-primary-600 transition-colors ${comment.user_vote === 'like' ? 'text-primary-600' : ''}`}>
                <ThumbsUp className={`w-4 h-4 ${comment.user_vote === 'like' ? 'fill-current' : ''}`} />
                <span>{comment.likes_count || 0}</span>
              </button>
              <button onClick={() => onVote(comment.id, 'dislike')} className={`flex items-center space-x-1 hover:text-red-600 transition-colors ${comment.user_vote === 'dislike' ? 'text-red-600' : ''}`}>
                <ThumbsDown className={`w-4 h-4 ${comment.user_vote === 'dislike' ? 'fill-current' : ''}`} />
                <span>{comment.dislikes_count || 0}</span>
              </button>
              {depth < 3 && user && (
                <button onClick={() => setShowReply(!showReply)} className="flex items-center space-x-1 hover:text-primary-600 transition-colors ml-2">
                  <MessageSquare className="w-4 h-4" />
                  <span>Reply</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {showReply && (
        <div className="mt-2 ml-4 sm:ml-8 pl-4 border-l-2 border-gray-100">
           <textarea
              autoFocus
              rows={2}
              placeholder="Write a reply..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 transition-all bg-white resize-none"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
            />
            <div className="mt-2 flex justify-end space-x-2">
              <button onClick={() => setShowReply(false)} className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 bg-transparent rounded-lg transition-colors">
                Cancel
              </button>
              <button onClick={handleReplySubmit} disabled={!replyText.trim()} className="px-4 py-1.5 rounded-lg text-xs font-bold shadow transition-all bg-primary-600 hover:bg-primary-500 text-white disabled:opacity-50">
                Reply
              </button>
            </div>
        </div>
      )}

      {replies.length > 0 && (
        <div className="space-y-1">
          {replies.map(reply => (
            <CommentItem key={reply.id} comment={reply} allComments={allComments} user={user} onReply={onReply} onDelete={onDelete} onVote={onVote} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPostDetails();
  }, [id]);

  const fetchPostDetails = async () => {
    try {
      const response = await axios.get(`${API_URL}/posts/${id}`, { withCredentials: true });
      setPost(response.data);
      setComments(response.data.comments || []);
    } catch (error) {
      console.error('Error fetching post:', error);
      alert('Post not found or network error.');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/posts/${id}/comments`, { content: newComment }, { withCredentials: true });
      fetchPostDetails();
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (parentId, text) => {
    try {
      await axios.post(`${API_URL}/posts/${id}/comments`, { content: text, parent_id: parentId }, { withCredentials: true });
      fetchPostDetails();
    } catch (error) {
      console.error('Error replying:', error);
      alert('Failed to reply.');
    }
  };

  const handleDeletePost = async () => {
    if(!window.confirm('Delete this post?')) return;
    try {
      await axios.delete(`${API_URL}/posts/${id}`, { withCredentials: true });
      navigate('/');
    } catch (err) { alert('Error deleting post'); }
  };

  const handleDeleteComment = async (commentId) => {
    if(!window.confirm('Delete this comment?')) return;
    try {
      await axios.delete(`${API_URL}/comments/${commentId}`, { withCredentials: true });
      setComments(comments.filter(c => c.id !== commentId && c.parent_id !== commentId));
      fetchPostDetails(); // refetch to clean up deeply nested children
    } catch (err) { alert('Error deleting comment'); }
  };

  const handleVote = async (commentId, type) => {
    if (!user) { alert('Please login to vote'); return; }
    try {
      const comment = comments.find(c => c.id === commentId);
      const isRemoving = comment.user_vote === type;
      await axios.post(`${API_URL}/comments/${commentId}/vote`, {
        vote_type: isRemoving ? null : type
      }, { withCredentials: true });
      fetchPostDetails(); // easy way to perfectly sync counts
    } catch (err) {
      console.error('Error voting:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!post) return null;

  const rootComments = comments.filter(c => !c.parent_id);

  return (
    <div className="max-w-3xl mx-auto py-6 animate-fade-in relative">
      <button 
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Back
      </button>

      {/* Main Post Card */}
      <div className={`
        bg-white rounded-2xl shadow-sm border overflow-hidden mb-8
        ${post.type === 'emergency' ? 'border-emergency-300 shadow-emergency-100' : 'border-gray-200'}
      `}>
        <div className={`p-8 ${post.type === 'emergency' ? 'bg-emergency-50/30' : ''}`}>
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center space-x-3 flex-wrap gap-y-2">
              {post.type === 'emergency' ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-wide bg-emergency-100 text-emergency-700 uppercase">
                  <AlertTriangle className="w-4 h-4 mr-1 animate-pulse" />
                  Emergency
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-wide bg-primary-100 text-primary-700 uppercase">
                  <HelpCircle className="w-4 h-4 mr-1" />
                  Query
                </span>
              )}
              {post.community_name && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-800">
                  {post.community_name}
                </span>
              )}
              <span className="text-sm text-gray-500 flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </span>
            </div>
            
            {user && post.author_id === user.id && (
              <button 
                onClick={handleDeletePost} 
                className="p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-full transition-colors"
                title="Delete Post"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>

          <h1 className={`text-3xl font-extrabold mb-4 leading-tight ${post.type === 'emergency' ? 'text-emergency-700' : 'text-gray-900'}`}>
            {post.title}
          </h1>
          
          <div className="prose max-w-none text-gray-700 text-lg leading-relaxed mb-6 whitespace-pre-line">
            {post.content}
          </div>

          {(() => {
            if (!post.location) return null;
            let locText = post.location;
            let locPos = null;
            if (post.location.includes('||')) {
              const parts = post.location.split('||');
              locText = parts[0];
              const coords = parts[1].split(',');
              if (coords.length === 2) {
                locPos = { lat: parseFloat(coords[0]), lng: parseFloat(coords[1]) };
              }
            } else if (post.location.match(/^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/)) {
               const coords = post.location.split(',');
               locText = "Exact Location Pin";
               locPos = { lat: parseFloat(coords[0]), lng: parseFloat(coords[1]) };
            }

            return (
              <div className="mt-4 space-y-3">
                <div className="inline-flex items-center p-3 bg-red-50 text-emergency-800 rounded-xl font-medium border border-emergency-200 w-full sm:w-auto">
                  <MapPin className="w-5 h-5 mr-2 flex-shrink-0" />
                  <span>Location: {locText}</span>
                </div>
                {locPos && (
                  <div className="h-48 w-full rounded-xl overflow-hidden border border-gray-200 relative z-0">
                    <MapContainer 
                      center={locPos} 
                      zoom={15} 
                      scrollWheelZoom={false} 
                      style={{ height: '100%', width: '100%' }}
                    >
                      <VectorTileLayer />
                      <Marker position={locPos}></Marker>
                    </MapContainer>
                  </div>
                )}
              </div>
            );
          })()}

          <div className="mt-8 pt-6 border-t border-gray-100 flex items-center text-gray-600">
            <div className="bg-gray-100 p-2 rounded-full mr-3">
              <User className="w-5 h-5 text-gray-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{post.author_name || 'Anonymous User'}</p>
              <p className="text-xs text-gray-500">{post.community_name ? 'Community Member' : 'Global User'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Suggested Responses / Comments Section */}
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-gray-900 border-b border-gray-200 pb-2">
          {post.type === 'emergency' ? 'Immediate Suggestions' : 'Community Responses'} ({comments.length})
        </h3>

        {rootComments.length === 0 ? (
          <p className="text-gray-500 italic bg-gray-50 p-6 rounded-xl border border-gray-100 text-center">
            No suggestions yet. Be the first to help out!
          </p>
        ) : (
          <div className="space-y-4">
            {rootComments.map((comment) => (
              <CommentItem 
                key={comment.id} 
                comment={comment} 
                allComments={comments} 
                user={user} 
                onReply={handleReply} 
                onDelete={handleDeleteComment} 
                onVote={handleVote} 
              />
            ))}
          </div>
        )}

        {/* Add Comment Form */}
        <div className="mt-10 bg-gray-50 p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-sm">
          <h4 className="font-bold text-gray-900 mb-4 flex items-center">
            <MessageSquare className="w-5 h-5 mr-2 text-primary-600" />
            {post.type === 'emergency' ? 'Add Hospital Suggestion / Help' : 'Your Advice / Suggestion'}
          </h4>
          <form onSubmit={handleCommentSubmit}>
            <textarea
              required
              rows={4}
              placeholder={post.type === 'emergency' ? "Suggest the nearest hospital with emergency care..." : "Write your suggestion here..."}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:border-transparent focus:ring-primary-500 transition-all bg-white resize-none"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />
            <div className="mt-4 flex justify-end">
              <button
                 type="submit"
                 disabled={submitting || !newComment.trim()}
                 className={`flex items-center px-6 py-2.5 rounded-lg text-sm font-bold shadow transition-all ${
                   submitting || !newComment.trim() ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-500 text-white focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'
                 }`}
              >
                {submitting ? 'Posting...' : 'Submit Suggestion'}
                {!submitting && <Send className="w-4 h-4 ml-2" />}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
