import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { Shield, Users, Lock, Unlock, Check, X, ShieldAlert, Trash2, MessageCircle, MapPin, Clock, AlertTriangle, HelpCircle, PlusCircle } from 'lucide-react';
import Avatar from '../components/Avatar';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export default function CommunityDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [comm, setComm] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    try {
      const res = await axios.get(`${API_URL}/communities/${id}`);
      setComm(res.data);
      const postRes = await axios.get(`${API_URL}/communities/${id}/posts`, { withCredentials: true });
      setPosts(postRes.data);
    } catch (err) {
      if (err.response?.status === 404) navigate('/communities');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const myMembership = comm?.members?.find(m => m.user_id === user?.id);
  const isAdmin = myMembership?.role === 'admin' && myMembership?.status === 'approved';
  const isCreator = comm?.created_by === user?.id;
  
  const handleJoin = async () => {
    try {
      const res = await axios.post(`${API_URL}/communities/${id}/join`);
      alert(res.data.message);
      fetchDetail();
    } catch (err) {
      alert('Error joining');
    }
  };

  const handleRequest = async (userId, action) => {
    try {
      await axios.post(`${API_URL}/communities/${id}/requests/${userId}`, { action });
      fetchDetail();
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Error updating request');
    }
  };

  const makeAdmin = async (targetUserId) => {
    if(!window.confirm('Make this user an admin?')) return;
    try {
      await axios.post(`${API_URL}/communities/${id}/admin`, { targetUserId });
      fetchDetail();
    } catch (err) {
      alert('Error promoting to admin');
    }
  };

  const handleDeleteCommunity = async () => {
    if(!window.confirm('Are you ABSOLUTELY sure? This will permanently delete the community and all related members/posts/data!')) return;
    try {
      await axios.delete(`${API_URL}/communities/${id}`);
      navigate('/communities');
    } catch (err) {
      alert('Error deleting community');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!comm) return null;

  const pendingRequests = comm.members.filter(m => m.status === 'pending');
  const approvedMembers = comm.members.filter(m => m.status === 'approved');

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in relative">
      <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-200 object-cover relative overflow-hidden">
        <div className={`absolute top-0 left-0 w-2 h-full ${comm.is_private ? 'bg-orange-500' : 'bg-primary-500'}`} />
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${comm.is_private ? 'bg-orange-100 text-orange-800' : 'bg-primary-100 text-primary-800'}`}>
                {comm.is_private ? <Lock className="w-3 h-3 mr-1"/> : <Unlock className="w-3 h-3 mr-1"/>}
                {comm.is_private ? 'Private' : 'Public'}
              </span>
              <span className="text-sm text-gray-500">Created by {comm.creator_name}</span>
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 mt-2">{comm.name}</h1>
            <p className="text-gray-600 mt-4 text-lg max-w-2xl">{comm.description}</p>
          </div>
          <div className="flex flex-col items-end space-y-3">
            {!myMembership && (
              <button onClick={handleJoin} className="btn-primary shadow-lg hover:-translate-y-0.5 transition-transform">
                {comm.is_private ? 'Request to Join' : 'Join Community'}
              </button>
            )}
            {myMembership?.status === 'pending' && (
              <span className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg font-medium border border-yellow-200">
                Join Request Pending
              </span>
            )}
            {myMembership?.status === 'approved' && (
              <span className="px-4 py-2 bg-green-100 text-green-800 rounded-lg font-medium border border-green-200 flex items-center">
                <Check className="w-4 h-4 mr-1"/> Member
              </span>
            )}

            {isCreator && (
              <button 
                onClick={handleDeleteCommunity}
                className="flex items-center text-sm font-semibold text-red-600 hover:text-white hover:bg-red-600 border border-red-200 px-3 py-1.5 rounded-lg transition-colors mt-2"
              >
                <Trash2 className="w-4 h-4 mr-1" /> Delete Community
              </button>
            )}
          </div>
        </div>
      </div>

      {(!comm.is_private || myMembership?.status === 'approved') ? (
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <h2 className="text-2xl font-bold flex items-center"><Users className="mr-2"/> Members ({approvedMembers.length})</h2>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <ul className="divide-y divide-gray-100">
                {approvedMembers.map(m => (
                  <li key={m.user_id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                    <div className="flex items-center">
                      <div className="w-8 h-8 mr-3">
                        <Avatar src={m.profile_picture} name={m.username} size="w-8 h-8" />
                      </div>
                      <div>
                        <span className="font-semibold text-gray-900">{m.username}</span>
                        {m.role === 'admin' && <span className="ml-2 text-xs text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full border border-primary-100">Admin</span>}
                      </div>
                    </div>
                    {isAdmin && m.role !== 'admin' && (
                      <button onClick={() => makeAdmin(m.user_id)} className="text-xs font-medium text-gray-500 hover:text-primary-600 border border-gray-300 rounded px-2 py-1">
                        Make Admin
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-12 space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold flex items-center">Posts</h2>
                <Link to={`/create?communityId=${id}`} className="btn-primary py-2 px-4 flex items-center text-sm">
                  <PlusCircle className="w-4 h-4 mr-1.5" />
                  Create Post
                </Link>
              </div>

              {posts.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
                  <HelpCircle className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No posts yet</h3>
                </div>
              ) : (
                <div className="space-y-4">
                  {posts.map(post => (
                    <Link key={post.id} to={`/post/${post.id}`} className="group block">
                      <div className={`p-6 bg-white rounded-xl border transition-all ${post.type === 'emergency' ? 'border-emergency-300 hover:border-emergency-500 shadow-emergency-50' : 'border-gray-200 hover:border-primary-400 hover:shadow-md'}`}>
                        <div className="flex justify-between items-center mb-3">
                          <div className="flex items-center space-x-2">
                             {post.type === 'emergency' ? (
                               <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emergency-100 text-emergency-700 uppercase">
                                 <AlertTriangle className="w-3 h-3 mr-1" /> Emergency
                               </span>
                             ) : (
                               <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-primary-100 text-primary-700 uppercase">
                                 <HelpCircle className="w-3 h-3 mr-1" /> Query
                               </span>
                             )}
                             <span className="text-xs text-gray-500 flex items-center">
                               <Clock className="w-3 h-3 mr-1" /> {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                             </span>
                          </div>
                        </div>
                        <h3 className={`text-lg font-bold mb-1 group-hover:text-primary-600 transition-colors ${post.type === 'emergency' ? 'text-emergency-700' : 'text-gray-900'}`}>{post.title}</h3>
                        <p className="text-gray-600 line-clamp-2 text-sm mb-3">{post.content}</p>
                        
                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center text-xs text-gray-500">
                            <span className="font-medium text-gray-900 mr-2">{post.author_name}</span>
                            {post.location && (
                              <span className="flex items-center text-gray-500 before:content-['•'] before:mx-2">
                                <MapPin className="w-3 h-3 mr-1 text-emergency-500" />
                                {post.location}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center text-gray-500 group-hover:text-primary-600 font-medium text-sm">
                            <MessageCircle className="w-4 h-4 mr-1" />
                            {post.comment_count}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {isAdmin && comm.is_private && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold flex items-center text-orange-700 bg-orange-50 p-3 rounded-lg border border-orange-100"><ShieldAlert className="mr-2 w-5 h-5"/> Pending Requests</h2>
              {pendingRequests.length === 0 ? (
                <p className="text-gray-500 italic p-4 bg-gray-50 rounded-lg">No pending requests.</p>
              ) : (
                <div className="space-y-3">
                  {pendingRequests.map(req => (
                    <div key={req.user_id} className="bg-white p-4 border border-gray-200 rounded-xl shadow-sm">
                      <p className="font-medium text-gray-900 mb-3">{req.username} wants to join</p>
                      <div className="flex justify-between space-x-2">
                         <button onClick={() => handleRequest(req.user_id, 'reject')} className="flex-1 py-1.5 px-3 bg-gray-100 hover:bg-red-100 hover:text-red-700 text-gray-600 rounded text-sm font-medium transition-colors text-center">
                           Reject
                         </button>
                         <button onClick={() => handleRequest(req.user_id, 'approve')} className="flex-1 py-1.5 px-3 bg-primary-600 hover:bg-primary-500 text-white rounded text-sm font-medium transition-colors text-center shadow-sm">
                           Approve
                         </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <Lock className="mx-auto w-16 h-16 text-gray-300 mb-4" />
          <h3 className="text-xl font-bold text-gray-900">This community is private</h3>
          <p className="text-gray-500 mt-2">You must be an approved member to view its members and content.</p>
        </div>
      )}
    </div>
  );
}
