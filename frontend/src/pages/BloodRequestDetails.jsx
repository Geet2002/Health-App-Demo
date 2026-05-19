import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Droplet, MapPin, Clock, User, Phone, Mail, MessageSquare, Send, CheckCircle, ArrowLeft, Trash2, Heart } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export default function BloodRequestDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [request, setRequest] = useState(null);
  const [comments, setComments] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [newComment, setNewComment] = useState('');
  const [offerForm, setOfferForm] = useState({ phone: '', email: '', message: '' });
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [submittingOffer, setSubmittingOffer] = useState(false);

  const fetchRequestDetails = async () => {
    try {
      const response = await axios.get(`${API_URL}/blood-requests/${id}`);
      setRequest({
        ...response.data,
        comments: undefined,
        offers: undefined
      });
      setComments(response.data.comments || []);
      setOffers(response.data.offers || []);
    } catch (error) {
      console.error('Error fetching blood request details:', error);
      if (error.response && error.response.status === 404) {
        navigate('/blood-donation');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequestDetails();
  }, [id]);

  const handleToggleStatus = async () => {
    try {
      const response = await axios.put(`${API_URL}/blood-requests/${id}/toggle-status`, {});
      setRequest({ ...request, status: response.data.status });
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error('Failed to update status.');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this blood request? This action cannot be undone.')) return;
    try {
      await axios.delete(`${API_URL}/blood-requests/${id}`);
      navigate('/blood-donation');
    } catch (error) {
      console.error('Error deleting request:', error);
      toast.error('Failed to delete request.');
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      await axios.post(`${API_URL}/blood-requests/${id}/comments`, { content: newComment });
      setNewComment('');
      fetchRequestDetails();
    } catch (error) {
      console.error('Error posting comment:', error);
      toast.error('Failed to post comment.');
    }
  };

  const handleOfferSubmit = async (e) => {
    e.preventDefault();
    setSubmittingOffer(true);
    try {
      await axios.post(`${API_URL}/blood-requests/${id}/offers`, offerForm);
      setOfferForm({ phone: '', email: '', message: '' });
      setShowOfferForm(false);
      toast.success('Your donation offer has been sent to the requester!');
      fetchRequestDetails();
    } catch (error) {
      console.error('Error submitting offer:', error);
      toast.error(error.response?.data?.error || 'Failed to submit offer.');
    } finally {
      setSubmittingOffer(false);
    }
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!request) return null;

  const isOwner = user && request.user_id === user.id;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-10">
      <Link to="/blood-donation" className="inline-flex items-center text-gray-500 hover:text-red-600 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Blood Requests
      </Link>

      {/* Main Request Card */}
      <div className={`bg-white rounded-2xl shadow-sm border overflow-hidden ${request.status === 'fulfilled' ? 'border-gray-200 opacity-80' : 'border-red-100'}`}>
        <div className={`px-6 py-5 border-b flex justify-between items-start ${request.status === 'fulfilled' ? 'bg-gray-50 border-gray-200' : 'bg-red-50/50 border-red-50'}`}>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{request.patient_name}</h1>
            <p className="text-sm text-gray-500 mt-1 flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              Requested {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
            </p>
          </div>
          <div className="flex flex-col items-end space-y-2">
            <span className="inline-flex items-center justify-center px-4 py-1.5 rounded-full text-xl font-black bg-red-100 text-red-700 border border-red-200">
              {request.blood_group}
            </span>
            <span className={`text-[11px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border ${getUrgencyColor(request.urgency)}`}>
              {request.urgency}
            </span>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start">
                <Droplet className="w-5 h-5 mr-3 mt-0.5 text-red-400 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-500 font-medium">Units Required</p>
                  <p className="text-lg font-semibold text-gray-900">{request.units_required} Units</p>
                </div>
              </div>
              <div className="flex items-start">
                <MapPin className="w-5 h-5 mr-3 mt-0.5 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-500 font-medium">Location</p>
                  <p className="text-gray-900 font-medium">{request.location}</p>
                </div>
              </div>
              <div className="flex items-start">
                <User className="w-5 h-5 mr-3 mt-0.5 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-500 font-medium">Requested By</p>
                  <p className="text-gray-900 font-medium">{request.requester_name}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-center items-center md:items-end space-y-4 md:border-l border-gray-100 md:pl-6">
              {isOwner ? (
                <div className="w-full space-y-3">
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Manage Request</p>
                  <button 
                    onClick={handleToggleStatus}
                    className={`w-full py-2.5 px-4 rounded-xl font-bold flex justify-center items-center transition-all ${
                      request.status === 'pending' 
                        ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                        : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                    }`}
                  >
                    <CheckCircle className="w-5 h-5 mr-2" />
                    {request.status === 'pending' ? 'Mark as Fulfilled' : 'Reopen Request'}
                  </button>
                  <button 
                    onClick={handleDelete}
                    className="w-full py-2.5 px-4 rounded-xl font-bold bg-red-50 text-red-600 hover:bg-red-100 flex justify-center items-center transition-all"
                  >
                    <Trash2 className="w-5 h-5 mr-2" />
                    Delete Request
                  </button>
                </div>
              ) : (
                request.status === 'pending' ? (
                  <div className="w-full text-center">
                    <Heart className="w-12 h-12 text-red-100 mx-auto mb-3" />
                    <p className="text-gray-600 mb-4 text-sm">Every drop counts. Offer to donate and help save a life today.</p>
                    <button 
                      onClick={() => setShowOfferForm(!showOfferForm)}
                      className="w-full btn-primary bg-red-600 hover:bg-red-700 py-3 text-lg font-bold"
                    >
                      I Can Donate
                    </button>
                  </div>
                ) : (
                  <div className="w-full text-center p-6 bg-gray-50 rounded-xl border border-gray-100">
                    <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-2" />
                    <p className="text-green-700 font-bold">This request has been fulfilled.</p>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Offer Form */}
      {showOfferForm && !isOwner && request.status === 'pending' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-red-100 animate-fade-in">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <Heart className="w-5 h-5 text-red-500 mr-2" fill="currentColor" />
            Offer Your Donation
          </h3>
          <form onSubmit={handleOfferSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="tel"
                    required
                    value={offerForm.phone}
                    onChange={e => setOfferForm({...offerForm, phone: e.target.value})}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                    placeholder="+91 00000 00000"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="email"
                    value={offerForm.email}
                    onChange={e => setOfferForm({...offerForm, email: e.target.value})}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                    placeholder="you@example.com"
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message (Optional)</label>
              <textarea
                value={offerForm.message}
                onChange={e => setOfferForm({...offerForm, message: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                placeholder="Let the requester know when you're available..."
                rows="3"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-2">
              <button 
                type="button" 
                onClick={() => setShowOfferForm(false)}
                className="px-5 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={submittingOffer}
                className="btn-primary bg-red-600 hover:bg-red-700 px-6 disabled:opacity-50"
              >
                {submittingOffer ? 'Sending...' : 'Send Offer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Offers List (Only visible to owner) */}
      {isOwner && offers.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h3 className="font-bold text-gray-900 flex items-center">
              <Heart className="w-5 h-5 text-red-500 mr-2" fill="currentColor" />
              Donation Offers ({offers.length})
            </h3>
            <p className="text-sm text-gray-500">Only you can see these contact details.</p>
          </div>
          <div className="divide-y divide-gray-100">
            {offers.map(offer => (
              <div key={offer.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold overflow-hidden border border-red-200">
                      {offer.donor_profile_picture ? (
                        <img src={`http://localhost:5001${offer.donor_profile_picture}`} alt="" className="w-full h-full object-cover" />
                      ) : (
                        offer.donor_name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{offer.donor_name}</p>
                      <p className="text-xs text-gray-500">{formatDistanceToNow(new Date(offer.created_at), { addSuffix: true })}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div className="flex items-center text-gray-700">
                    <Phone className="w-4 h-4 mr-2 text-gray-400" />
                    <a href={`tel:${offer.phone}`} className="hover:text-red-600">{offer.phone}</a>
                  </div>
                  <div className="flex items-center text-gray-700">
                    <Mail className="w-4 h-4 mr-2 text-gray-400" />
                    <a href={`mailto:${offer.email}`} className="hover:text-red-600">{offer.email}</a>
                  </div>
                </div>
                {offer.message && (
                  <div className="mt-3 text-gray-600 text-sm italic bg-gray-50/50 p-3 rounded-lg">
                    "{offer.message}"
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User's own offers if not owner */}
      {!isOwner && offers.length > 0 && (
        <div className="bg-green-50 rounded-2xl p-6 border border-green-200">
          <div className="flex items-center text-green-800 font-bold mb-2">
            <CheckCircle className="w-5 h-5 mr-2" />
            You have offered to donate
          </div>
          <p className="text-green-700 text-sm">The requester has received your contact details and message.</p>
        </div>
      )}

      {/* Questions & Comments Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 flex items-center">
            <MessageSquare className="w-5 h-5 text-gray-400 mr-2" />
            Questions & Comments ({comments.length})
          </h3>
        </div>
        
        <div className="p-6 space-y-6">
          {comments.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No questions or comments yet. Be the first to ask!</p>
          ) : (
            <div className="space-y-6">
              {comments.map(comment => (
                <div key={comment.id} className="flex space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-200 flex items-center justify-center text-gray-500 font-bold">
                    {comment.author_profile_picture ? (
                      <img src={`http://localhost:5001${comment.author_profile_picture}`} alt="" className="w-full h-full object-cover" />
                    ) : (
                      comment.author_name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 bg-gray-50 p-4 rounded-2xl rounded-tl-none border border-gray-100">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-sm text-gray-900">
                        {comment.author_name} 
                        {comment.author_id === request.user_id && (
                          <span className="ml-2 text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Requester</span>
                        )}
                      </span>
                      <span className="text-xs text-gray-400">{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}</span>
                    </div>
                    <p className="text-gray-700 text-sm">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Comment Form */}
          {request.status === 'pending' ? (
            <form onSubmit={handleCommentSubmit} className="mt-6 flex items-start space-x-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-200 flex items-center justify-center text-gray-500 font-bold">
                {user?.profile_picture ? (
                  <img src={`http://localhost:5001${user.profile_picture}`} alt="" className="w-full h-full object-cover" />
                ) : (
                  user?.username?.charAt(0).toUpperCase() || 'U'
                )}
              </div>
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Ask a question or leave a comment..."
                  className="w-full pl-4 pr-12 py-3 border border-gray-200 rounded-full focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none text-sm bg-gray-50 hover:bg-white transition-colors"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim()}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-red-600 hover:bg-red-50 rounded-full disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-6 p-4 bg-gray-50 border border-gray-100 rounded-xl text-center text-gray-500 text-sm italic flex items-center justify-center">
              <CheckCircle className="w-4 h-4 mr-2" />
              This request has been fulfilled. Comments are closed.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}