import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import GoogleMap from '../components/GoogleMap';
import { formatDistanceToNow } from 'date-fns';
import { SingleBloodRequestSkeleton } from '../components/Skeletons';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import Avatar from '../components/Avatar';
import LocationSelector from '../components/LocationSelector';
import { Droplet, MapPin, Clock, PlusCircle, User, CheckCircle, AlertCircle, Calendar, MessageSquare, Send, Trash2, Edit2, Shield, Heart, Phone, Mail, ArrowLeft, X } from 'lucide-react';
import { useConfirm } from '../context/ConfirmContext';
import { socket } from '../socket';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export default function BloodRequestDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const confirm = useConfirm();
  
  const [request, setRequest] = useState(null);
  const [comments, setComments] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [newComment, setNewComment] = useState('');
  const [offerForm, setOfferForm] = useState({ contact_phone_at_offer: '', contact_email_at_offer: '', message: '' });
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [submittingOffer, setSubmittingOffer] = useState(false);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    patient_name: '',
    blood_group: '',
    units_required: 1,
    location: '',
    location_lat: null,
    location_lng: null,
    urgency: 'high'
  });

  const mapCenter = useMemo(() => {
    if (request && request.location_lat && request.location_lng) {
      return { 
        lat: parseFloat(request.location_lat), 
        lng: parseFloat(request.location_lng) 
      };
    }
    return null;
  }, [request?.location_lat, request?.location_lng]);

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
      
      if (!isEditing) {
        setEditForm({
          patient_name: response.data.patient_name,
          blood_group: response.data.blood_group,
          units_required: response.data.units_required,
          location: response.data.location,
          location_lat: response.data.location_lat,
          location_lng: response.data.location_lng,
          urgency: response.data.urgency || 'high'
        });
      }
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

  useEffect(() => {
    const handleUpdate = () => {
      fetchRequestDetails();
    };
    socket.on('blood_request_updated', handleUpdate);
    return () => {
      socket.off('blood_request_updated', handleUpdate);
    };
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
    const ok = await confirm({
      title: 'Delete Blood Request',
      message: 'Are you sure you want to delete this blood donation request? This action cannot be undone and will permanently remove it.',
      confirmText: 'Delete Request',
      confirmColor: 'bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md',
      type: 'danger'
    });
    if (!ok) return;

    try {
      await axios.delete(`${API_URL}/blood-requests/${id}`);
      toast.success('Blood request deleted successfully');
      navigate('/blood-donation');
    } catch (error) {
      console.error('Error deleting request:', error);
      toast.error('Failed to delete request.');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const isUsingMap = editForm.use_map !== undefined ? editForm.use_map : !!(editForm.location_lat && editForm.location_lng);
    if (isUsingMap && (!editForm.location_lat || !editForm.location_lng)) {
      toast.error('Please click "Find on Map" or drop a pin to confirm the exact location!');
      return;
    }
    
    try {
      await axios.put(`${API_URL}/blood-requests/${id}`, editForm);
      setIsEditing(false);
      toast.success('Blood request updated');
      fetchRequestDetails();
    } catch (error) {
      console.error('Error updating request:', error);
      toast.error('Failed to update request.');
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
      setOfferForm({ contact_phone_at_offer: '', contact_email_at_offer: '', message: '' });
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

  const handleWithdrawOffer = async () => {
    const ok = await confirm({
      title: 'Withdraw Donation Offer',
      message: 'Are you sure you want to withdraw your donation offer? The requester will no longer be able to view your contact information for this donation.',
      confirmText: 'Withdraw Offer',
      confirmColor: 'bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md',
      type: 'danger'
    });
    if (!ok) return;

    try {
      await axios.delete(`${API_URL}/blood-requests/${id}/offers`);
      toast.success('Donation offer withdrawn successfully');
      fetchRequestDetails();
    } catch (error) {
      console.error('Error withdrawing offer:', error);
      toast.error('Failed to withdraw offer.');
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
      <div className="max-w-4xl mx-auto pb-32 px-4 sm:px-6 lg:px-8 pt-4 sm:pt-8 space-y-6">
        <SingleBloodRequestSkeleton />
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
        
        {isEditing ? (
          <form onSubmit={handleEditSubmit} className="p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <Edit2 className="w-5 h-5 mr-2 text-red-500" />
              Edit Blood Request
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Patient Name</label>
                <input
                  type="text"
                  required
                  value={editForm.patient_name}
                  onChange={e => setEditForm({...editForm, patient_name: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
                <select
                  required
                  value={editForm.blood_group}
                  onChange={e => setEditForm({...editForm, blood_group: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
                >
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Units Required</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={editForm.units_required}
                  onChange={e => setEditForm({...editForm, units_required: parseInt(e.target.value)})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <LocationSelector formData={editForm} setFormData={setEditForm} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Urgency</label>
                <select
                  required
                  value={editForm.urgency}
                  onChange={e => setEditForm({...editForm, urgency: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
                >
                  <option value="medium">Medium - Within a few days</option>
                  <option value="high">High - Within 24 hours</option>
                  <option value="critical">Critical - Immediate</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-5 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary bg-red-600 hover:bg-red-700 px-6"
              >
                Save Changes
              </button>
            </div>
          </form>
        ) : (
          <>
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

            {/* Map Display (Optional) */}
            {mapCenter && (
              <div className="w-full h-48 md:h-full min-h-[200px] rounded-xl overflow-hidden border border-gray-200 relative z-0">
                <GoogleMap 
                  center={mapCenter} 
                  zoom={15} 
                  markerPosition={mapCenter}
                />
              </div>
            )}
          </div>
          
          <div className={`mt-6 ${request.location_lat && request.location_lng ? 'md:mt-6' : ''}`}>            <div className="flex flex-col justify-center items-center md:items-end space-y-4 md:border-l border-gray-100 md:pl-6">
              {isOwner ? (
                <div className="w-full space-y-3">
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Manage Request</p>
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="w-full py-2.5 px-4 rounded-xl font-bold flex justify-center items-center transition-all bg-blue-50 text-blue-600 hover:bg-blue-100"
                  >
                    <Edit2 className="w-5 h-5 mr-2" />
                    Edit Request
                  </button>
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
                (!isOwner && offers.length > 0) ? (
                  <div className="w-full text-center bg-green-50 p-6 rounded-xl border border-green-200">
                    <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-2" />
                    <p className="text-green-800 font-bold mb-2">You have offered to donate</p>
                    <p className="text-green-700 text-sm mb-4">The requester has your contact details.</p>
                    <button 
                      onClick={handleWithdrawOffer}
                      className="w-full py-2.5 px-4 rounded-xl font-bold bg-white text-red-600 border border-red-200 hover:bg-red-50 flex justify-center items-center transition-all shadow-sm"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Withdraw Offer
                    </button>
                  </div>
                ) : request.status === 'pending' ? (
                  <div className="w-full text-center">
                    {user?.is_admin ? (
                      <p className="text-gray-500 italic mt-4">Admins cannot donate blood.</p>
                    ) : (
                      <>
                        <Heart className="w-12 h-12 text-red-100 mx-auto mb-3" />
                        <p className="text-gray-600 mb-4 text-sm">Every drop counts. Offer to donate and help save a life today.</p>
                        <button 
                          onClick={() => setShowOfferForm(!showOfferForm)}
                          className="w-full btn-primary bg-red-600 hover:bg-red-700 py-3 text-lg font-bold"
                        >
                          I Can Donate
                        </button>
                      </>
                    )}
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
        </>
        )}
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
                    value={offerForm.contact_phone_at_offer}
                    onChange={e => setOfferForm({...offerForm, contact_phone_at_offer: e.target.value})}
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
                    value={offerForm.contact_email_at_offer}
                    onChange={e => setOfferForm({...offerForm, contact_email_at_offer: e.target.value})}
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
                    <div className="w-10 h-10">
                      <Avatar src={offer.donor_profile_picture} name={offer.donor_name} size="w-10 h-10" />
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
                    <a href={`tel:${offer.contact_phone_at_offer}`} className="hover:text-red-600">{offer.contact_phone_at_offer}</a>
                  </div>
                  <div className="flex items-center text-gray-700">
                    <Mail className="w-4 h-4 mr-2 text-gray-400" />
                    <a href={`mailto:${offer.contact_email_at_offer}`} className="hover:text-red-600">{offer.contact_email_at_offer}</a>
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
                  <div className="w-10 h-10">
                    <Avatar src={comment.author_profile_picture} name={comment.author_name} size="w-10 h-10" />
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
              <div className="w-10 h-10 mt-1">
                <Avatar src={user?.profile_picture} name={user?.username} size="w-10 h-10" />
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