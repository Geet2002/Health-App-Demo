import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Users, Lock, Unlock, Check, X, ShieldAlert, Trash2, MessageCircle, MapPin, Clock, AlertTriangle, HelpCircle, PlusCircle, Calendar, BookOpen, ExternalLink, Link as LinkIcon, Edit2, LogOut, Search, Locate, MapIcon } from 'lucide-react';
import GoogleMap, { loadGoogleMaps } from '../components/GoogleMap';
import LocationSelector from '../components/LocationSelector';
import Avatar from '../components/Avatar';
import MedicalBadge from '../components/MedicalBadge';
import PostCard from '../components/PostCard';
import ShareMenu from '../components/ShareMenu';
import { CommunityCardSkeleton } from '../components/Skeletons';
import { socket } from '../socket';
import CreatePost from './CreatePost';

import { useConfirm } from '../context/ConfirmContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
const BASE_URL = API_URL.replace(/\/api$/, '');


function useTabPagination(fetchUrl, id, initialLimit = 10) {
  const [items, setItems] = React.useState([]);
  const [page, setPage] = React.useState(0);
  const [hasMore, setHasMore] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [debouncedQuery, setDebouncedQuery] = React.useState('');

  React.useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(searchQuery), 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchItems = React.useCallback(async (pageNum = 0, isLoadMore = false) => {
    if (!id) return;
    if (!isLoadMore) setLoading(true);
    else setLoadingMore(true);

    try {
      const offset = pageNum * initialLimit;
      const url = `${fetchUrl.replace(':id', id)}?limit=${initialLimit}&offset=${offset}&search=${encodeURIComponent(debouncedQuery)}`;
      const res = await axios.get(url);
      
      const fetchedItems = res.data;
      if (isLoadMore) {
        setItems(prev => {
          const newItems = fetchedItems.filter(newIt => !prev.some(p => (p.id || p.user_id) === (newIt.id || newIt.user_id)));
          return [...prev, ...newItems];
        });
      } else {
        setItems(fetchedItems);
      }
      setHasMore(fetchedItems.length === initialLimit);
      setPage(pageNum);
    } catch (err) {
      console.error(err);
    } finally {
      if (!isLoadMore) setLoading(false);
      else setLoadingMore(false);
    }
  }, [id, fetchUrl, initialLimit, debouncedQuery]);

  React.useEffect(() => {
    setPage(0);
    setHasMore(true);
    setItems([]);
    fetchItems(0, false);
  }, [fetchItems]);

  const observer = React.useRef();
  const lastElementRef = React.useCallback(node => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        fetchItems(page + 1, true);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore, page, fetchItems]);

  return { items, setItems, page, hasMore, loading, loadingMore, searchQuery, setSearchQuery, fetchItems, lastElementRef };
}

export default function CommunityDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [searchParams, setSearchParams] = useSearchParams();
  const [comm, setComm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'feed'); // feed, events, resources, members

  const feedPagination = useTabPagination(`${API_URL}/communities/:id/posts`, id);
  const eventsPagination = useTabPagination(`${API_URL}/communities/:id/events`, id);
  const resourcesPagination = useTabPagination(`${API_URL}/communities/:id/resources`, id);
  const membersPagination = useTabPagination(`${API_URL}/communities/:id/members`, id);

  const posts = feedPagination.items;
  const setPosts = feedPagination.setItems;
  const events = eventsPagination.items;
  const setEvents = eventsPagination.setItems;
  const resources = resourcesPagination.items;
  const setResources = resourcesPagination.setItems;
  const paginatedMembers = membersPagination.items;

  // Editing community name and bio state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editingPost, setEditingPost] = useState(null);

  // Active Event Details modal state
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [attendeeSearchQuery, setAttendeeSearchQuery] = useState('');
  const [loadingAttendees, setLoadingAttendees] = useState(false);

  const fetchAttendees = async (eventId) => {
    setLoadingAttendees(true);
    try {
      const res = await axios.get(`${API_URL}/events/${eventId}/attendees`);
      setAttendees(res.data);
    } catch (err) {
      console.error('Error fetching attendees:', err);
    } finally {
      setLoadingAttendees(false);
    }
  };

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['feed', 'events', 'resources', 'members'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    setSearchParams({ tab: tabName });
  };

  // Event creation state
  const [showEventForm, setShowEventForm] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', description: '', event_date: '', location: '', location_lat: null, location_lng: null, use_map: false });

  // Resource creation state
  const [showResourceForm, setShowResourceForm] = useState(false);
  const [newResource, setNewResource] = useState({ title: '', content: '', link: '', file: null });
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setNewResource({ ...newResource, file: e.dataTransfer.files[0] });
    }
  };

  // Edit states
  const [editingEvent, setEditingEvent] = useState(null);
  const [editingResource, setEditingResource] = useState(null);

  // New items states
  const [hasNewFeed, setHasNewFeed] = useState(false);
  const [hasNewEvents, setHasNewEvents] = useState(false);
  const [hasNewResources, setHasNewResources] = useState(false);

  // Create Post Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createModalType, setCreateModalType] = useState('query');

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    try {
      const res = await axios.get(`${API_URL}/communities/${id}`);
      setComm(res.data);
      setEditForm({ name: res.data.name, description: res.data.description || '' });
    } catch (err) {
      if (err.response?.status === 404) navigate('/communities');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleMemberUpdate = (updatedId) => {
      if (parseInt(updatedId) === parseInt(id)) {
        fetchDetail();
        membersPagination.fetchItems(0, false);
      }
    };
    
    const handleEventUpdate = (data) => {
      const updatedId = data?.communityId || data;
      if (parseInt(updatedId) === parseInt(id)) {
        if (data?.action === 'add' && parseInt(data?.triggerUserId) !== parseInt(user?.id)) {
          setHasNewEvents(true);
        } else {
          eventsPagination.fetchItems(0, false);
        }
      }
    };
    
    const handleResourceUpdate = (data) => {
      const updatedId = data?.communityId || data;
      if (parseInt(updatedId) === parseInt(id)) {
        if (data?.action === 'add' && parseInt(data?.triggerUserId) !== parseInt(user?.id)) {
          setHasNewResources(true);
        } else {
          resourcesPagination.fetchItems(0, false);
        }
      }
    };

    const handleFeedUpdate = (data) => {
      const updatedId = data?.communityId || data;
      if (parseInt(updatedId) === parseInt(id)) {
        if (data?.action === 'add' && parseInt(data?.triggerUserId) !== parseInt(user?.id)) {
          setHasNewFeed(true);
        } else {
          feedPagination.fetchItems(0, false);
        }
      }
    };

    const handlePostUpdate = () => {
      feedPagination.fetchItems(0, false);
    };

    socket.on('community_member_updated', handleMemberUpdate);
    socket.on('community_event_updated', handleEventUpdate);
    socket.on('community_resource_updated', handleResourceUpdate);
    socket.on('community_feed_updated', handleFeedUpdate);
    socket.on('post_updated', handlePostUpdate);
    socket.on('comment_updated', handlePostUpdate);

    return () => {
      socket.off('community_member_updated', handleMemberUpdate);
      socket.off('community_event_updated', handleEventUpdate);
      socket.off('community_resource_updated', handleResourceUpdate);
      socket.off('community_feed_updated', handleFeedUpdate);
      socket.off('post_updated', handlePostUpdate);
      socket.off('comment_updated', handlePostUpdate);
    };
  }, [id, membersPagination.fetchItems, eventsPagination.fetchItems, resourcesPagination.fetchItems, feedPagination.fetchItems]);

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editForm.name.trim()) {
      toast.error('Community name is required');
      return;
    }
    setIsSavingEdit(true);
    try {
      const res = await axios.put(`${API_URL}/communities/${id}`, editForm);
      toast.success(res.data.message || 'Community updated successfully!');
      setIsEditing(false);
      fetchDetail();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update community');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleCreatePost = async () => {
    feedPagination.fetchItems(0, false);
  };

  const handleDeletePost = async (e, postId) => {
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
      await axios.delete(`${API_URL}/posts/${postId}`);
      setPosts(posts.filter(p => p.id !== postId));
      toast.success('Post deleted successfully');
    } catch (err) {
      toast.error('Error deleting post');
    }
  };

  const myMembership = comm?.members?.find(m => m.user_id === user?.id);
  const isAdmin = myMembership?.role === 'admin' && myMembership?.status === 'approved';
  const isCreator = comm?.created_by === user?.id;
  
  const handleJoin = async () => {
    try {
      const res = await axios.post(`${API_URL}/communities/${id}/join`);
      toast.success(res.data.message);
      fetchDetail();
    } catch (err) {
      toast.error('Error joining');
    }
  };

  const handleLeaveCommunity = async () => {
    const ok = await confirm({
      title: 'Leave Community',
      message: 'Are you sure you want to leave this community?',
      confirmText: 'Leave',
      type: 'danger'
    });
    if (!ok) return;
    
    try {
      await axios.post(`${API_URL}/communities/${id}/leave`);
      toast.success('Successfully left the community');
      fetchDetail();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error leaving community');
    }
  };

  const handleCancelRequest = async () => {
    const ok = await confirm({
      title: 'Cancel Request',
      message: 'Are you sure you want to cancel your join request?',
      confirmText: 'Cancel Request',
      type: 'danger'
    });
    if (!ok) return;
    
    try {
      await axios.post(`${API_URL}/communities/${id}/leave`);
      toast.success('Join request cancelled');
      fetchDetail();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error cancelling request');
    }
  };

  const handleRequest = async (userId, action) => {
    try {
      await axios.post(`${API_URL}/communities/${id}/requests/${userId}`, { action });
      fetchDetail();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Error updating request');
    }
  };

  const removeMember = async (targetUserId, targetUsername) => {
    const ok = await confirm({
      title: 'Remove Member',
      message: `Are you sure you want to remove ${targetUsername} from this community?`,
      confirmText: 'Remove Member',
      type: 'danger'
    });
    if (!ok) return;

    try {
      await axios.delete(`${API_URL}/communities/${id}/members/${targetUserId}`);
      toast.success('Member removed successfully');
      fetchDetail();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error removing member');
    }
  };

  const makeAdmin = async (targetUserId) => {
    const ok = await confirm({
      title: 'Promote to Admin',
      message: 'Are you sure you want to promote this member to a community admin? They will gain full privileges to edit community details, manage resources, and host events.',
      confirmText: 'Promote to Admin',
      confirmColor: 'bg-primary-600 hover:bg-primary-700 text-white shadow-sm hover:shadow-md',
      type: 'info'
    });
    if (!ok) return;

    try {
      await axios.post(`${API_URL}/communities/${id}/admin`, { targetUserId });
      toast.success('User promoted to admin!');
      fetchDetail();
    } catch (err) {
      toast.error('Error promoting to admin');
    }
  };

  const demoteAdmin = async (targetUserId) => {
    const ok = await confirm({
      title: 'Remove Admin Role',
      message: 'Are you sure you want to demote this user from admin? They will become a regular member.',
      confirmText: 'Remove Admin Role',
      confirmColor: 'bg-orange-600 hover:bg-orange-700 text-white shadow-sm hover:shadow-md',
      type: 'warning'
    });
    if (!ok) return;

    try {
      await axios.post(`${API_URL}/communities/${id}/demote`, { targetUserId });
      toast.success('Admin role removed!');
      fetchDetail();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error demoting admin');
    }
  };

  const handleDeleteCommunity = async () => {
    const ok = await confirm({
      title: 'Delete Community',
      message: 'Are you ABSOLUTELY sure? This action is irreversible. This will permanently delete the community and all related members, posts, events, resources, and associated data!',
      confirmText: 'Delete Permanently',
      confirmColor: 'bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md',
      type: 'danger'
    });
    if (!ok) return;

    try {
      await axios.delete(`${API_URL}/communities/${id}`);
      toast.success('Community deleted successfully');
      navigate('/communities');
    } catch (err) {
      toast.error('Error deleting community');
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (newEvent.use_map && (!newEvent.location_lat || !newEvent.location_lng)) {
      toast.error('Please click "Find on Map" or drop a pin to confirm the exact location!');
      return;
    }
    
    try {
      await axios.post(`${API_URL}/communities/${id}/events`, newEvent);
      toast.success('Event created!');
      setShowEventForm(false);
      setNewEvent({ title: '', description: '', event_date: '', location: '', location_lat: null, location_lng: null, use_map: false });
      fetchDetail();
      eventsPagination.fetchItems(0, false);
    } catch (err) {
      toast.error('Failed to create event');
    }
  };

  const handleCreateResource = async (e) => {
    e.preventDefault();
    if (!newResource.title.trim()) return;

    if (newResource.file && newResource.file.size > 20 * 1024 * 1024) {
      toast.error("File size exceeds the 20MB limit.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append('title', newResource.title);
      formData.append('content', newResource.content);
      if (newResource.link) formData.append('link', newResource.link);
      if (newResource.file) formData.append('file', newResource.file);

      await axios.post(`${API_URL}/communities/${id}/resources`, formData);
      toast.success('Resource added!');
      setShowResourceForm(false);
      setNewResource({ title: '', content: '', link: '', file: null });
      fetchDetail();
      resourcesPagination.fetchItems(0, false);
    } catch (err) {
      toast.error('Failed to add resource');
    }
  };

  const handleUpdateEvent = async (e) => {
    e.preventDefault();
    const isUsingMap = editingEvent.use_map !== undefined ? editingEvent.use_map : !!(editingEvent.location_lat && editingEvent.location_lng);
    if (isUsingMap && (!editingEvent.location_lat || !editingEvent.location_lng)) {
      toast.error('Please click "Find on Map" or drop a pin to confirm the exact location!');
      return;
    }

    try {
      // Need to format date properly for input if needed, but it's handled by onChange mostly.
      await axios.put(`${API_URL}/communities/${id}/events/${editingEvent.id}`, editingEvent);
      toast.success('Event updated!');
      setEditingEvent(null);
      fetchDetail();
      eventsPagination.fetchItems(0, false);
    } catch (err) {
      toast.error('Failed to update event');
    }
  };

  const handleDeleteEvent = async (eventId) => {
    const ok = await confirm({
      title: 'Delete Event',
      message: 'Are you sure you want to delete this event?',
      confirmText: 'Delete',
      type: 'danger'
    });
    if (!ok) return;

    try {
      await axios.delete(`${API_URL}/communities/${id}/events/${eventId}`);
      toast.success('Event deleted');
      fetchDetail();
      eventsPagination.fetchItems(0, false);
    } catch (err) {
      toast.error('Failed to delete event');
    }
  };

  const handleUpdateResource = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_URL}/communities/${id}/resources/${editingResource.id}`, editingResource);
      toast.success('Resource updated!');
      setEditingResource(null);
      fetchDetail();
      resourcesPagination.fetchItems(0, false);
    } catch (err) {
      toast.error('Failed to update resource');
    }
  };

  const handleDeleteResource = async (resourceId) => {
    const ok = await confirm({
      title: 'Delete Resource',
      message: 'Are you sure you want to delete this resource?',
      confirmText: 'Delete',
      type: 'danger'
    });
    if (!ok) return;

    try {
      await axios.delete(`${API_URL}/communities/${id}/resources/${resourceId}`);
      toast.success('Resource deleted');
      fetchDetail();
      resourcesPagination.fetchItems(0, false);
    } catch (err) {
      toast.error('Failed to delete resource');
    }
  };

  const handleRsvp = async (eventId, currentlyAttending) => {
    try {
      await axios.post(`${API_URL}/events/${eventId}/rsvp`, { attending: !currentlyAttending });
      fetchDetail();
      
      // If the selected event is currently being viewed, update its user_attending state and reload its attendees!
      if (selectedEvent && selectedEvent.id === eventId) {
        setSelectedEvent(prev => ({
          ...prev,
          user_attending: !currentlyAttending ? 1 : 0,
          attendee_count: !currentlyAttending ? prev.attendee_count + 1 : Math.max(0, prev.attendee_count - 1)
        }));
        fetchAttendees(eventId);
      }
      
      toast.success(!currentlyAttending ? 'RSVP Confirmed!' : 'RSVP Cancelled');
    } catch (err) {
      toast.error('Error updating RSVP');
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto animate-fade-in pb-32 pt-2 px-4 sm:px-0 space-y-6">
         <CommunityCardSkeleton />
      </div>
    );
  }
  if (!comm) return null;

  const pendingRequests = comm.members.filter(m => m.status === 'pending');
  const approvedMembers = comm.members.filter(m => m.status === 'approved');
  const hasAccess = !comm.is_private || myMembership?.status === 'approved';

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 animate-fade-in relative pb-28 sm:pb-12">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 relative overflow-hidden">
        {/* Minimal Top Accent Line */}
        <div className={`absolute top-0 inset-x-0 h-1.5 ${comm.is_private ? 'bg-orange-500' : 'bg-primary-500'}`} />
        
        {/* Main Content Area */}
        <div className="p-4 sm:p-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-6">
          <div className="flex-1 w-full">
            <div className="flex items-center space-x-2 sm:space-x-3 mb-1 sm:mb-2">
              <span className={`inline-flex items-center px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full text-[10px] sm:text-xs font-bold ${comm.is_private ? 'bg-orange-100 text-orange-800' : 'bg-primary-100 text-primary-800'}`}>
                {comm.is_private ? <Lock className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1"/> : <Unlock className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1"/>}
                {comm.is_private ? 'Private' : 'Public'}
              </span>
              <span className="text-xs sm:text-sm text-gray-500 font-medium">By {comm.creator_name}</span>
            </div>
            {isEditing ? (
              <form onSubmit={handleSaveEdit} className="space-y-4 mt-4 w-full max-w-2xl">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Community Name</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-250 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-gray-900 font-semibold shadow-sm transition-all"
                    placeholder="Community Name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Community Bio</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-250 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-gray-700 leading-relaxed shadow-sm transition-all"
                    placeholder="Describe your community..."
                    rows="3"
                  />
                </div>
                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setEditForm({ name: comm.name, description: comm.description || '' });
                    }}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm transition-colors border border-gray-200"
                    disabled={isSavingEdit}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary py-2 px-5 text-sm font-bold shadow-sm"
                    disabled={isSavingEdit}
                  >
                    {isSavingEdit ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-1 sm:mt-2 leading-tight">{comm.name}</h1>
                <p className="text-gray-600 mt-2 sm:mt-4 text-sm sm:text-lg max-w-2xl leading-snug">{comm.description}</p>
              </>
            )}
          </div>
          <div className="flex flex-row flex-wrap items-center w-full sm:w-auto sm:justify-end gap-2 sm:gap-3 pt-1">
            {(user?.is_admin !== 1 && user?.is_admin !== true) && !myMembership && (
              <button onClick={handleJoin} className="btn-primary flex-1 sm:flex-none whitespace-nowrap shadow-sm sm:shadow-lg text-xs sm:text-sm px-3 py-1.5 sm:py-2 hover:-translate-y-0.5 transition-transform">
                {comm.is_private ? 'Request to Join' : 'Join Community'}
              </button>
            )}
            {myMembership?.status === 'pending' && (
              <div className="flex space-x-2 shrink-0 items-center bg-yellow-50 border border-yellow-200 rounded-lg p-1.5 sm:p-2">
                <span className="px-2 py-0.5 text-yellow-800 text-xs sm:text-sm font-semibold">
                  Request Pending
                </span>
                <button 
                  onClick={handleCancelRequest}
                  className="text-xs font-semibold text-gray-400 hover:text-white hover:bg-red-500 border border-gray-200 hover:border-red-500 px-2 py-1 rounded transition-colors shadow-sm"
                  title="Cancel Request"
                >
                  Cancel
                </button>
              </div>
            )}
            {myMembership?.status === 'approved' && (
              <div className="flex space-x-2 shrink-0">
                <span className="px-3 py-1.5 sm:px-4 sm:py-2 bg-green-50 sm:bg-green-100 text-green-700 sm:text-green-800 rounded-lg text-xs sm:text-sm font-bold border border-green-200 flex items-center whitespace-nowrap">
                  <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1"/> Member
                </span>
                {!isCreator && (
                  <button 
                    onClick={handleLeaveCommunity} 
                    className="flex flex-1 sm:flex-none justify-center items-center whitespace-nowrap text-sm font-semibold text-gray-400 hover:text-white hover:bg-red-500 border border-gray-200 hover:border-red-500 px-3 py-1.5 rounded-lg transition-all shadow-sm group"
                    title="Leave Community"
                  >
                    <LogOut className="w-4 h-4 mr-1.5 text-gray-400 group-hover:text-white transition-colors" /> Leave
                  </button>
                )}
              </div>
            )}
            {isAdmin && !isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                className="flex flex-1 sm:flex-none justify-center items-center whitespace-nowrap text-xs sm:text-sm font-bold text-primary-600 hover:text-white hover:bg-primary-600 border border-primary-250 px-3 py-1.5 sm:py-2 rounded-lg transition-colors shadow-sm"
              >
                <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" /> Edit
              </button>
            )}
            {isCreator && (
              <button 
                onClick={handleDeleteCommunity}
                className="flex flex-1 sm:flex-none justify-center items-center whitespace-nowrap text-xs sm:text-sm font-bold text-red-600 hover:text-white hover:bg-red-600 border border-red-200 px-3 py-1.5 sm:py-2 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" /> Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>

      {/* Mobile Compact Stats Strip */}
      <div className="md:hidden flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl p-3 text-xs text-gray-500 font-medium shadow-sm">
        <span className="flex items-center"><Calendar className="w-3.5 h-3.5 mr-1 text-gray-400"/> {new Date(comm.created_at).toLocaleDateString()}</span>
        <span className="flex items-center"><Users className="w-3.5 h-3.5 mr-1 text-gray-400"/> {approvedMembers.length} Members</span>
        <span className="capitalize">{comm.is_private ? 'Private' : 'Public'}</span>
      </div>



      {hasAccess ? (
        <>
          {/* Tabs Navigation */}
          <div className="flex space-x-1 bg-white p-1 rounded-xl shadow-sm border border-gray-100 overflow-x-auto scrollbar-hide">
            {['feed', 'events', 'resources', 'members'].map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`flex-1 min-w-[100px] sm:min-w-0 py-2.5 px-3 sm:px-4 text-sm font-semibold rounded-lg capitalize flex justify-center items-center whitespace-nowrap transition-colors ${
                  activeTab === tab 
                    ? 'bg-primary-50 text-primary-700 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {tab === 'feed' && <MessageCircle className="w-4 h-4 mr-2" />}
                {tab === 'events' && <Calendar className="w-4 h-4 mr-2" />}
                {tab === 'resources' && <BookOpen className="w-4 h-4 mr-2" />}
                {tab === 'members' && <Users className="w-4 h-4 mr-2" />}
                {tab}
                {tab === 'members' && isAdmin && comm.is_private && pendingRequests.length > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {pendingRequests.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-6">
              
              {/* FEED TAB */}
          {activeTab === 'feed' && (
            <div className="space-y-4 sm:space-y-6 animate-fade-in relative">
              {hasNewFeed && (
                <div className="absolute -top-4 left-0 right-0 flex justify-center z-30">
                  <button 
                    onClick={() => { setHasNewFeed(false); feedPagination.fetchItems(0, false); window.scrollTo({top: 0, behavior: 'smooth'}); }}
                    className="bg-primary-600 text-white px-4 py-1.5 rounded-full shadow-lg text-sm font-bold flex items-center animate-bounce hover:bg-primary-700 transition-colors"
                  >
                    ↑ New Posts
                  </button>
                </div>
              )}
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search posts..."
                    value={feedPagination.searchQuery}
                    onChange={(e) => feedPagination.setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm shadow-sm"
                  />
                </div>
                {hasAccess && !comm.is_banned && (
                  <button 
                    onClick={() => { setCreateModalType('query'); setShowCreateModal(true); }}
                    className="btn-primary py-2 px-4 flex justify-center items-center text-sm shadow-sm"
                  >
                    <PlusCircle className="w-4 h-4 mr-1.5" />
                    Create Post
                  </button>
                )}
              </div>
              {posts.length === 0 && !feedPagination.loading ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
                  <HelpCircle className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No posts found</h3>
                </div>
              ) : (
                <div className="space-y-4">
                  <AnimatePresence>
                    {posts.map(post => (
                      <motion.div
                        key={post.id}
                        initial={Date.now() - new Date(post.created_at).getTime() < 10000 ? { opacity: 0, height: 0, y: -20 } : false}
                        animate={{ opacity: 1, height: "auto", y: 0 }}
                        exit={{ opacity: 0, height: 0, scale: 0.95 }}
                        transition={{ duration: 0.3 }}
                        layout
                        className="overflow-hidden"
                      >
                        <PostCard 
                          post={post} 
                          currentUser={user} 
                          onDelete={handleDeletePost} 
                          onEdit={(p) => setEditingPost(p)}
                          onVote={feedPagination.fetchItems}
                          hideCommunityName={true}
                          isCommunityAdmin={isAdmin}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {feedPagination.loadingMore && <div className="text-center py-4 text-gray-500 text-sm font-medium">Loading more posts...</div>}
                  {!feedPagination.loadingMore && feedPagination.hasMore && (
                    <div ref={feedPagination.lastElementRef} className="h-4 w-full"></div>
                  )}
                </div>
              )}
            </div>
          )}

              {/* EVENTS TAB */}
              {activeTab === 'events' && (
                <div className="space-y-6 animate-fade-in relative">
                  {hasNewEvents && (
                    <div className="absolute -top-4 left-0 right-0 flex justify-center z-30">
                      <button 
                        onClick={() => { setHasNewEvents(false); eventsPagination.fetchItems(0, false); window.scrollTo({top: 0, behavior: 'smooth'}); }}
                        className="bg-primary-600 text-white px-4 py-1.5 rounded-full shadow-lg text-sm font-bold flex items-center animate-bounce hover:bg-primary-700 transition-colors"
                      >
                        ↑ New Events
                      </button>
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search events by title, description, or location..."
                        value={eventsPagination.searchQuery}
                        onChange={(e) => eventsPagination.setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm shadow-sm"
                      />
                    </div>
                    {(isAdmin || myMembership?.status === 'approved') && (
                      <button onClick={() => setShowEventForm(!showEventForm)} className="btn-primary py-2 px-4 flex justify-center items-center text-sm shadow-sm">
                        <PlusCircle className="w-4 h-4 mr-1.5" />
                        {showEventForm ? 'Cancel' : 'Create Event'}
                      </button>
                    )}
                  </div>

                  {showEventForm && (
                    <form onSubmit={handleCreateEvent} className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                      <h3 className="font-bold text-gray-900 mb-2">Host an Event</h3>
                      <input type="text" placeholder="Event Title" required className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" value={newEvent.title} onChange={e => setNewEvent(prev => ({...prev, title: e.target.value}))} />
                      <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 w-full flex items-center border border-gray-200 rounded-lg px-3 bg-white focus-within:ring-2 focus-within:ring-primary-500">
                          <span className="text-gray-500 text-sm whitespace-nowrap mr-2 font-medium">Date:</span>
                          <input type="date" required className="flex-1 w-full min-w-0 py-2 outline-none bg-transparent" value={(newEvent.event_date || '').split('T')[0] || ''} onChange={e => {
                            const time = (newEvent.event_date || '').split('T')[1] || '00:00';
                            setNewEvent(prev => ({...prev, event_date: `${e.target.value}T${time}`}));
                          }} />
                        </div>
                        <div className="flex-1 w-full flex items-center border border-gray-200 rounded-lg px-3 bg-white focus-within:ring-2 focus-within:ring-primary-500">
                          <span className="text-gray-500 text-sm whitespace-nowrap mr-2 font-medium">Time:</span>
                          <input type="time" required className="flex-1 w-full min-w-0 py-2 outline-none bg-transparent" value={(newEvent.event_date || '').split('T')[1] || ''} onChange={e => {
                            const date = (newEvent.event_date || '').split('T')[0] || new Date().toISOString().split('T')[0];
                            setNewEvent(prev => ({...prev, event_date: `${date}T${e.target.value}`}));
                          }} />
                        </div>
                      </div>
                      <LocationSelector formData={newEvent} setFormData={setNewEvent} />
                      <textarea placeholder="Event Description..." className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" rows="3" value={newEvent.description} onChange={e => setNewEvent(prev => ({...prev, description: e.target.value}))}></textarea>
                      <button type="submit" className="btn-primary w-full py-2">Publish Event</button>
                    </form>
                  )}

                  {events.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
                      <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No upcoming events</h3>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <AnimatePresence>
                        {events.map(event => (
                          <motion.div
                            key={event.id}
                            initial={Date.now() - new Date(event.created_at).getTime() < 10000 ? { opacity: 0, height: 0, y: -20 } : false}
                            animate={{ opacity: 1, height: "auto", y: 0 }}
                            exit={{ opacity: 0, height: 0, scale: 0.95 }}
                            transition={{ duration: 0.3 }}
                            layout
                            className="overflow-hidden"
                          >
                          {editingEvent?.id === event.id ? (
                            <form onSubmit={handleUpdateEvent} className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                              <h3 className="font-bold text-gray-900 mb-2">Edit Event</h3>
                              <input type="text" placeholder="Event Title" required className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" value={editingEvent.title} onChange={e => setEditingEvent(prev => ({...prev, title: e.target.value}))} />
                              <textarea placeholder="Event Description" required className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" rows="3" value={editingEvent.description} onChange={e => setEditingEvent(prev => ({...prev, description: e.target.value}))}></textarea>
                              <div className="flex flex-col md:flex-row gap-4">
                                  <div className="flex-1 w-full flex items-center border border-gray-200 rounded-lg px-3 bg-white focus-within:ring-2 focus-within:ring-primary-500">
                                    <span className="text-gray-500 text-sm whitespace-nowrap mr-2 font-medium">Date:</span>
                                    <input type="date" required className="flex-1 w-full min-w-0 py-2 outline-none bg-transparent" 
                                      value={editingEvent.event_date ? new Date(new Date(editingEvent.event_date).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10) : ''} 
                                      onChange={e => {
                                        try {
                                          const local = new Date(new Date(editingEvent.event_date || Date.now()).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                                          const time = local.split('T')[1];
                                          setEditingEvent(prev => ({...prev, event_date: `${e.target.value}T${time}`}));
                                        } catch (err) {
                                          setEditingEvent(prev => ({...prev, event_date: `${e.target.value}T00:00`}));
                                        }
                                      }}
                                    />
                                  </div>
                                  <div className="flex-1 w-full flex items-center border border-gray-200 rounded-lg px-3 bg-white focus-within:ring-2 focus-within:ring-primary-500">
                                    <span className="text-gray-500 text-sm whitespace-nowrap mr-2 font-medium">Time:</span>
                                    <input type="time" required className="flex-1 w-full min-w-0 py-2 outline-none bg-transparent" 
                                      value={editingEvent.event_date ? new Date(new Date(editingEvent.event_date).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(11, 16) : ''} 
                                      onChange={e => {
                                        try {
                                          const local = new Date(new Date(editingEvent.event_date || Date.now()).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                                          const date = local.split('T')[0];
                                          setEditingEvent(prev => ({...prev, event_date: `${date}T${e.target.value}`}));
                                        } catch (err) {
                                          const date = new Date().toISOString().split('T')[0];
                                          setEditingEvent(prev => ({...prev, event_date: `${date}T${e.target.value}`}));
                                        }
                                      }}
                                    />
                                  </div>
                                </div>
                              <LocationSelector formData={editingEvent} setFormData={setEditingEvent} />
                              <div className="flex space-x-3">
                                <button type="submit" className="btn-primary flex-1 py-2">Save Changes</button>
                                <button type="button" onClick={() => setEditingEvent(null)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition-colors">Cancel</button>
                              </div>
                            </form>
                          ) : (
                            <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col md:flex-row md:items-center justify-between shadow-sm hover:shadow-md transition-shadow relative">
                              {/* Badges and Delete Actions */}
                              <div className="absolute top-4 right-4 flex items-center space-x-2">
                                <ShareMenu url={`${window.location.origin}/community/${id}`} text={`Check out this event: ${event.title}`} />
                                {(isAdmin || event.created_by === user?.id) && (
                                  <div className="flex items-center space-x-1">
                                    <button onClick={(e) => { e.stopPropagation(); setEditingEvent(event); }} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteEvent(event.id); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </div>
                              <div 
                                onClick={() => {
                                  setSelectedEvent(event);
                                  setAttendeeSearchQuery('');
                                  fetchAttendees(event.id);
                                }}
                                className="flex-1 mb-4 md:mb-0 cursor-pointer group pr-16"
                              >
                                <h3 className="text-lg font-bold text-gray-900 group-hover:text-primary-600 transition-colors">{event.title}</h3>
                                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{event.description}</p>
                                <div className="flex flex-col mt-4 space-y-2 text-[13px] text-gray-600">
                                  <div className="flex items-center w-fit text-primary-700 font-bold bg-primary-50 px-2.5 py-1 rounded-md border border-primary-100">
                                    <Calendar className="w-4 h-4 mr-1.5" />
                                    {new Date(event.event_date).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                                  </div>
                                  <div className="flex items-start flex-wrap gap-2">
                                    <div className="flex items-start">
                                      <MapPin className="w-4 h-4 mr-1.5 mt-0.5 text-gray-400 flex-shrink-0" />
                                      <span className="line-clamp-2">{event.location}</span>
                                    </div>
                                    {event.location_lat && event.location_lng && (
                                      <span className="text-primary-600 inline-flex items-center text-[10px] font-bold bg-primary-50 px-1.5 py-0.5 rounded border border-primary-100 ml-1 mt-0.5">
                                        <MapIcon className="w-3 h-3 mr-1" /> Map Available
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center">
                                    <Users className="w-4 h-4 mr-1.5 text-gray-400" />
                                    <span className="font-medium">{event.attendee_count} attending</span>
                                  </div>
                                </div>
                              </div>
                              <div className="md:ml-6 flex-shrink-0 relative z-10">
                                <button
                                  onClick={() => handleRsvp(event.id, event.user_attending > 0)}
                                  className={`w-full md:w-auto px-6 py-2.5 rounded-lg font-bold transition-colors ${event.user_attending > 0 ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200' : 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm'}`}
                                >
                                  {event.user_attending > 0 ? 'Cancel RSVP' : 'Attend Event'}
                                </button>
                              </div>
                            </div>
                          )}
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      {eventsPagination.loadingMore && <div className="text-center py-4 text-gray-500 text-sm font-medium">Loading more events...</div>}
                      {!eventsPagination.loadingMore && eventsPagination.hasMore && (
                        <div ref={eventsPagination.lastElementRef} className="h-4 w-full"></div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* RESOURCES TAB */}
              {activeTab === 'resources' && (
                <div className="space-y-6 animate-fade-in relative">
                  {hasNewResources && (
                    <div className="absolute -top-4 left-0 right-0 flex justify-center z-30">
                      <button 
                        onClick={() => { setHasNewResources(false); resourcesPagination.fetchItems(0, false); window.scrollTo({top: 0, behavior: 'smooth'}); }}
                        className="bg-primary-600 text-white px-4 py-1.5 rounded-full shadow-lg text-sm font-bold flex items-center animate-bounce hover:bg-primary-700 transition-colors"
                      >
                        ↑ New Resources
                      </button>
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search resources..."
                        value={resourcesPagination.searchQuery}
                        onChange={(e) => resourcesPagination.setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm shadow-sm"
                      />
                    </div>
                    {(isAdmin || myMembership?.status === 'approved') && (
                      <button onClick={() => setShowResourceForm(!showResourceForm)} className="btn-primary py-2 px-4 flex justify-center items-center text-sm shadow-sm">
                        <PlusCircle className="w-4 h-4 mr-1.5" />
                        {showResourceForm ? 'Cancel' : 'Add Resource'}
                      </button>
                    )}
                  </div>

                  {showResourceForm && (
                    <form onSubmit={handleCreateResource} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                      <h3 className="font-bold text-gray-900 mb-2">Add a Resource Guide</h3>
                      <input type="text" placeholder="Resource Title (e.g., Trusted Local Pharmacies)" required className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" value={newResource.title} onChange={e => setNewResource({...newResource, title: e.target.value})} />
                      <input type="url" placeholder="External Link (Optional, e.g., YouTube Link)" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" value={newResource.link} onChange={e => setNewResource({...newResource, link: e.target.value})} />
                      <div 
                        className={`relative overflow-hidden flex flex-col space-y-2 p-6 rounded-xl border-2 border-dashed transition-all duration-200 ${isDragging ? 'border-primary-500 bg-primary-50/50' : 'border-gray-300 bg-gray-50/50 hover:bg-gray-50'}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                      >
                        <div className="flex flex-col items-center justify-center text-center space-y-2 pointer-events-none">
                          <div className="p-3 bg-white rounded-full shadow-sm border border-gray-100">
                            <svg className="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-700">Drag and drop your file here</p>
                            <p className="text-xs text-gray-500 mt-1">or click to browse (Max 20MB)</p>
                          </div>
                          <input 
                            type="file" 
                            accept="image/*,video/*,.pdf" 
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                            onChange={e => setNewResource({...newResource, file: e.target.files[0]})} 
                          />
                          {newResource.file && (
                            <div className="mt-3 text-xs font-semibold text-primary-700 bg-primary-100 px-3 py-1.5 rounded-lg flex items-center justify-between w-full relative z-20 pointer-events-auto">
                              <span className="truncate">{newResource.file.name}</span>
                              <button type="button" onClick={() => setNewResource({...newResource, file: null})} className="ml-2 hover:text-primary-900 focus:outline-none p-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <textarea placeholder="Resource Content or details (Optional)..." className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" rows="4" value={newResource.content} onChange={e => setNewResource({...newResource, content: e.target.value})}></textarea>
                      <button type="submit" className="btn-primary w-full py-2">Publish Resource</button>
                    </form>
                  )}

                  {resources.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
                      <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No resources yet</h3>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-6">
                      <AnimatePresence>
                        {resources.map(res => (
                          <motion.div 
                            key={res.id}
                            initial={Date.now() - new Date(res.created_at).getTime() < 10000 ? { opacity: 0, height: 0, y: -20 } : false}
                            animate={{ opacity: 1, height: "auto", y: 0 }}
                            exit={{ opacity: 0, height: 0, scale: 0.95 }}
                            transition={{ duration: 0.3 }}
                            layout
                            className="overflow-hidden"
                          >
                          {editingResource?.id === res.id ? (
                            <form onSubmit={handleUpdateResource} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                              <h3 className="font-bold text-gray-900 mb-2">Edit Resource</h3>
                              <input type="text" placeholder="Resource Title" required className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm" value={editingResource.title} onChange={e => setEditingResource({...editingResource, title: e.target.value})} />
                              <input type="url" placeholder="External Link (Optional)" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm" value={editingResource.link || ''} onChange={e => setEditingResource({...editingResource, link: e.target.value})} />
                              <textarea placeholder="Resource Content (Optional)" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm" rows="3" value={editingResource.content} onChange={e => setEditingResource({...editingResource, content: e.target.value})}></textarea>
                              <div className="flex space-x-2">
                                <button type="submit" className="btn-primary flex-1 py-1.5 text-sm">Save</button>
                                <button type="button" onClick={() => setEditingResource(null)} className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition-colors text-sm">Cancel</button>
                              </div>
                            </form>
                          ) : (
                            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:border-primary-300 transition-colors relative group">
                              {(isAdmin || res.created_by === user?.id) && (
                                <div className="absolute top-4 right-4 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => setEditingResource(res)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => handleDeleteResource(res.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                              <h3 className="font-bold text-gray-900 mb-2 flex items-start justify-between pr-14">
                                {res.title}
                                {res.link && (!res.file_type || res.file_type === 'link') && (
                                  <a href={res.link} target="_blank" rel="noreferrer" className="text-primary-600 hover:text-primary-800 p-1 bg-primary-50 rounded">
                                    <ExternalLink className="w-4 h-4" />
                                  </a>
                                )}
                              </h3>
                              {res.file_path && (
                                <div className="mb-4 relative group/media">
                                  {res.file_type?.startsWith('image/') && <img src={`${BASE_URL}${res.file_path}`} alt={res.title} className="rounded-lg max-h-60 w-full object-contain bg-gray-50 border border-gray-100" />}
                                  {res.file_type?.startsWith('video/') && <video src={`${BASE_URL}${res.file_path}`} controls className="rounded-lg w-full border border-gray-100 bg-black" />}
                                  {res.file_type === 'application/pdf' && <object data={`${BASE_URL}${res.file_path}`} type="application/pdf" className="w-full h-96 border border-gray-200 rounded-lg" />}
                                  
                                  <a 
                                    href={`${BASE_URL}${res.file_path}`} 
                                    download 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="inline-flex items-center px-3 py-1.5 mt-2 text-xs font-bold text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors border border-primary-100"
                                  >
                                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                    Download File
                                  </a>
                                </div>
                              )}
                              {res.link && (res.link.includes('youtube.com') || res.link.includes('youtu.be')) && (
                                <div className="mb-4 aspect-video">
                                  <iframe src={`https://www.youtube.com/embed/${res.link.split('v=')[1] || res.link.split('/').pop()}`} className="w-full h-full rounded-lg" frameBorder="0" allowFullScreen></iframe>
                                </div>
                              )}
                              <p className="text-sm text-gray-600 mb-4 whitespace-pre-wrap line-clamp-4">{res.content}</p>
                              <div className="text-xs text-gray-400 flex items-center justify-between border-t border-gray-100 pt-3">
                                <span>Added by {res.creator_name}</span>
                                <span>{formatDistanceToNow(new Date(res.created_at))} ago</span>
                              </div>
                            </div>
                          )}
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      {resourcesPagination.loadingMore && <div className="col-span-1 text-center py-4 text-gray-500 text-sm font-medium">Loading more resources...</div>}
                      {!resourcesPagination.loadingMore && resourcesPagination.hasMore && (
                        <div ref={resourcesPagination.lastElementRef} className="col-span-1 h-4 w-full"></div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* MEMBERS TAB */}
              {activeTab === 'members' && (
                <div className="space-y-6 animate-fade-in">
                  {isAdmin && comm.is_private && pendingRequests.length > 0 && (
                    <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 shadow-sm">
                      <h2 className="text-sm font-bold flex items-center text-orange-800 mb-3">
                        <ShieldAlert className="mr-2 w-4 h-4"/> Pending Join Requests ({pendingRequests.length})
                      </h2>
                      <div className="space-y-2">
                        {pendingRequests.map(req => (
                          <div key={req.user_id} className="bg-white p-3 border border-orange-200/60 rounded-lg flex items-center justify-between">
                            <p className="font-medium text-gray-900 text-sm truncate pr-2">{req.username}</p>
                            <div className="flex space-x-2 shrink-0">
                               <button onClick={() => handleRequest(req.user_id, 'reject')} className="px-3 py-1.5 bg-gray-100 hover:bg-red-100 hover:text-red-700 text-gray-600 rounded text-xs font-bold transition-colors">Reject</button>
                               <button onClick={() => handleRequest(req.user_id, 'approve')} className="px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white rounded text-xs font-bold transition-colors shadow-sm">Approve</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div className="relative flex-1 w-full">
                      <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search members..."
                        value={membersPagination.searchQuery}
                        onChange={(e) => membersPagination.setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm shadow-sm"
                      />
                    </div>
                  </div>
                  
                  {paginatedMembers.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
                      <Users className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No members found</h3>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                      <ul className="divide-y divide-gray-100">
                        {paginatedMembers.map(m => (
                          <li key={m.user_id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center min-w-0">
                              <div className="w-10 h-10 mr-4 shrink-0">
                                <Avatar src={m.profile_picture} name={m.username} size="w-10 h-10" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center">
                                  <span className="font-semibold text-gray-900 truncate">{m.username}</span>
                                  <MedicalBadge isMedicalProfessional={m.is_medical_professional} />
                                </div>
                                {m.role === 'admin' && <span className="text-[10px] font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full border border-primary-200 mt-0.5 inline-block uppercase tracking-wider">Admin</span>}
                              </div>
                            </div>
                            {(() => {
                              const isCreator = user?.id === comm?.created_by;
                              const isSelf = m.user_id === user?.id;
                              
                              if (!isAdmin || isSelf) return null;
                              if (m.role === 'admin' && !isCreator) return null;
                              
                              return (
                                <div className="flex items-center space-x-2 shrink-0 self-start sm:self-auto ml-14 sm:ml-0">
                                  {m.role !== 'admin' ? (
                                    <button onClick={() => makeAdmin(m.user_id)} className="text-xs font-bold text-gray-600 hover:text-white hover:bg-primary-600 border border-gray-200 hover:border-primary-600 rounded-lg px-3 py-1.5 transition-all shadow-sm">
                                      Make Admin
                                    </button>
                                  ) : (
                                    <button onClick={() => demoteAdmin(m.user_id)} className="text-xs font-bold text-orange-600 hover:text-white hover:bg-orange-500 border border-orange-200 hover:border-orange-500 rounded-lg px-3 py-1.5 transition-all shadow-sm">
                                      Remove Admin
                                    </button>
                                  )}
                                  <button onClick={() => removeMember(m.user_id, m.username)} className="text-xs font-bold text-red-600 hover:text-white hover:bg-red-600 border border-red-200 hover:border-red-600 rounded-lg px-3 py-1.5 transition-all shadow-sm">
                                    Remove
                                  </button>
                                </div>
                              );
                            })()}
                          </li>
                        ))}
                      </ul>
                      {membersPagination.loadingMore && <div className="text-center py-4 text-gray-500 text-sm font-medium bg-gray-50">Loading more members...</div>}
                      {!membersPagination.loadingMore && membersPagination.hasMore && (
                        <div ref={membersPagination.lastElementRef} className="h-4 w-full"></div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sidebar content */}
            <div className="hidden md:block space-y-6">

              {isAdmin && (
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center">
                    <Shield className="w-4 h-4 mr-2 text-primary-600" /> Admin Panel
                  </h3>
                  <p className="text-xs text-gray-500 mb-4">You have administrative access to this community.</p>
                  <button 
                    onClick={() => {
                      setIsEditing(true);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="w-full flex items-center justify-center text-sm font-semibold text-primary-600 hover:text-white hover:bg-primary-600 border border-primary-200 px-4 py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md"
                  >
                    <Edit2 className="w-4 h-4 mr-2" /> Edit Community Details
                  </button>
                </div>
              )}
              
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-4">About this Community</h3>
                <p className="text-sm text-gray-600 mb-6">{comm.description}</p>
                <div className="space-y-3 text-sm text-gray-500">
                  <div className="flex justify-between">
                    <span>Created</span>
                    <span className="font-medium text-gray-900">{new Date(comm.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Members</span>
                    <span className="font-medium text-gray-900">{approvedMembers.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Visibility</span>
                    <span className="font-medium text-gray-900 capitalize">{comm.is_private ? 'Private' : 'Public'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 shadow-sm mt-8">
          <Lock className="mx-auto w-16 h-16 text-gray-300 mb-4" />
          <h3 className="text-xl font-bold text-gray-900">This community is private</h3>
          <p className="text-gray-500 mt-2">You must request to join and be approved to view its content.</p>
        </div>
      )}

      {/* Event Details Modal */}
      {selectedEvent && createPortal(
        <div 
          className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedEvent(null)}
        >
          <div 
            className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-gray-150 relative animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Body */}
            <div className="p-6 sm:p-8 space-y-6 overflow-y-auto">
              <div className="flex justify-between items-start">
                <h3 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight pr-4">
                  {selectedEvent.title}
                </h3>
                <button 
                  onClick={() => setSelectedEvent(null)}
                  className="p-1.5 hover:bg-gray-100 rounded-full transition-colors focus:outline-none"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Event Info Metadata */}
              <div className="space-y-3 bg-gray-50/50 p-4 rounded-2xl border border-gray-100 text-sm">
                <div className="flex items-center text-gray-700">
                  <Calendar className="w-4 h-4 mr-2 text-primary-500" />
                  <span className="font-semibold">{new Date(selectedEvent.event_date).toLocaleString()}</span>
                </div>
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center text-gray-700">
                    <MapPin className="w-4 h-4 mr-2 text-red-500" />
                    <span>{selectedEvent.location}</span>
                  </div>
                  {selectedEvent.location_lat && selectedEvent.location_lng && (
                    <div className="h-48 rounded-xl overflow-hidden border border-gray-200 relative z-0 mt-3 w-full">
                      <GoogleMap 
                        center={{ lat: parseFloat(selectedEvent.location_lat), lng: parseFloat(selectedEvent.location_lng) }} 
                        zoom={15} 
                        markerPosition={{ lat: parseFloat(selectedEvent.location_lat), lng: parseFloat(selectedEvent.location_lng) }}
                      />
                    </div>
                  )}
                </div>
                <div className="flex items-center text-gray-700">
                  <Users className="w-4 h-4 mr-2 text-indigo-500" />
                  <span>{selectedEvent.attendee_count} attending</span>
                </div>
                <div className="flex items-center text-gray-500 text-xs border-t border-gray-100 pt-2.5 mt-2.5">
                  <span className="font-medium">Hosted by:</span>
                  <span className="ml-1.5 font-bold text-gray-800">{selectedEvent.creator_name || 'Community Admin'}</span>
                </div>
              </div>

              {/* Description */}
              {selectedEvent.description && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-400">About the Event</h4>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line bg-gray-50/20 p-3 rounded-xl border border-gray-100/50">
                    {selectedEvent.description}
                  </p>
                </div>
              )}

              {/* RSVP Action */}
              <div className="flex items-center justify-between border-t border-gray-100 pt-5">
                <span className="text-xs text-gray-500 font-medium">Are you planning to attend?</span>
                <button
                  onClick={() => handleRsvp(selectedEvent.id, selectedEvent.user_attending > 0)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors ${
                    selectedEvent.user_attending > 0 
                      ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-100' 
                      : 'bg-primary-600 text-white hover:bg-primary-700'
                  }`}
                >
                  {selectedEvent.user_attending > 0 ? 'Cancel RSVP' : 'Attend Event'}
                </button>
              </div>

              {/* Attendees List Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-400">Who's Coming ({attendees.length})</h4>
                  {attendees.length > 5 && (
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input 
                        type="text" 
                        placeholder="Search attendees..." 
                        className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none w-36 sm:w-48 bg-gray-50 focus:bg-white transition-colors"
                        value={attendeeSearchQuery}
                        onChange={e => setAttendeeSearchQuery(e.target.value)}
                      />
                    </div>
                  )}
                </div>
                
                {loadingAttendees ? (
                  <div className="flex justify-center items-center py-6">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                  </div>
                ) : attendees.length === 0 ? (
                  <div className="text-center py-6 bg-gray-50/50 rounded-2xl border border-dashed border-gray-150">
                    <p className="text-xs text-gray-400 font-medium">No RSVPs yet. Be the first to join!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-52 sm:max-h-60 overflow-y-auto pr-1">
                    {attendees.filter(a => a.username.toLowerCase().includes(attendeeSearchQuery.toLowerCase())).map(member => (
                      <div key={member.id} className="flex items-center space-x-2.5 p-2 rounded-xl bg-gray-50/50 border border-gray-100">
                        <Link to={`/user/${member.id}`} onClick={() => setSelectedEvent(null)} className="shrink-0 hover:opacity-85 transition-opacity">
                          <Avatar src={member.profile_picture} name={member.username} size="w-8 h-8" />
                        </Link>
                        <div className="min-w-0 flex-1">
                          <Link 
                            to={`/user/${member.id}`} 
                            onClick={() => setSelectedEvent(null)}
                            className="text-xs font-bold text-gray-800 hover:text-primary-600 transition-colors truncate flex items-center"
                          >
                            {member.username}
                            <MedicalBadge isMedicalProfessional={member.is_medical_professional} className="w-3.5 h-3.5 ml-1 shrink-0" />
                          </Link>
                        </div>
                      </div>
                    ))}
                    {attendees.filter(a => a.username.toLowerCase().includes(attendeeSearchQuery.toLowerCase())).length === 0 && (
                      <div className="col-span-2 text-center py-4 text-xs text-gray-400">No attendees match your search.</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
      {showCreateModal && (
        <CreatePost 
          isModal={true} 
          initialType={createModalType} 
          communityIdProp={id}
          onClose={(success) => {
            setShowCreateModal(false);
            if (success === true) {
              feedPagination.fetchItems(0, false);
            }
          }} 
        />
      )}
      
      {editingPost && (
        <CreatePost 
          isModal={true} 
          editingPost={editingPost}
          communityIdProp={id}
          onClose={(success) => {
            setEditingPost(null);
            if (success === true) {
              feedPagination.fetchItems(0, false);
            }
          }} 
        />
      )}
    </div>
  );
}
