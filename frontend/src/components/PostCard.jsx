import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, HelpCircle, MessageCircle, MapPin, Clock, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function PostCard({ post, currentUser, onDelete }) {
  const isOwner = currentUser && post.author_id === currentUser.id;
  const isEmergency = post.type === 'emergency';

  return (
    <Link key={post.id} to={`/post/${post.id}`} className="group block outline-none">
      <article className={`flex bg-white border rounded-2xl overflow-hidden transition-all duration-300 ${isEmergency ? 'border-emergency-300 shadow-lg' : 'border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5'}`}>
        {/* left accent */}
        <div className={`w-1 ${isEmergency ? 'bg-red-500' : 'bg-primary-500'} hidden sm:block`} />

        <div className="p-5 sm:p-6 flex-1 relative">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-700">{(post.author_name || 'A').slice(0,2)}</div>
              <div>
                <div className="text-sm font-semibold text-gray-900">{post.author_name || 'Anonymous User'}</div>
                <div className="text-xs text-gray-400 flex items-center">
                  <Clock className="w-3.5 h-3.5 mr-1.5" />
                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase ${isEmergency ? 'bg-red-100 text-red-700' : 'bg-primary-50 text-primary-700 border border-primary-100'}`}>
                {isEmergency ? <AlertTriangle className="w-4 h-4 mr-1.5" /> : <HelpCircle className="w-4 h-4 mr-1.5" />}
                {isEmergency ? 'Emergency' : 'Query'}
              </span>

              {isOwner && (
                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete && onDelete(e, post.id); }} className="p-2 text-gray-300 hover:bg-red-50 hover:text-red-600 rounded-full transition-colors" title="Delete Post">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <h3 className={`text-xl font-bold mb-2 ${isEmergency ? 'text-red-700' : 'text-gray-900'}`}>{post.title}</h3>

          <p className="text-gray-600 text-sm mb-4 line-clamp-3">{post.content}</p>

          <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-50">
            <div className="flex items-center text-sm text-gray-500 flex-wrap gap-2">
              {post.community_name && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-gray-50 text-gray-600 border border-gray-100">{post.community_name}</span>
              )}

              {post.location && (
                <span className="flex items-center text-gray-500">
                  <MapPin className="w-3.5 h-3.5 mr-1 text-primary-500" />
                  <span className="text-sm">{post.location}</span>
                </span>
              )}
            </div>

            <div className={`flex items-center font-bold px-3 py-1.5 rounded-full ${isEmergency ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-600'}`}>
              <MessageCircle className="w-4 h-4 mr-1.5" />
              {post.comment_count || 0} Responses
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
