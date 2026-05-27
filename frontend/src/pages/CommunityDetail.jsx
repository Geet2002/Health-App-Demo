import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { Shield, Users, Lock, Unlock, Check, X, ShieldAlert, Trash2, MessageCircle, MapPin, Clock, AlertTriangle, HelpCircle, PlusCircle, Calendar, BookOpen, ExternalLink, Link as LinkIcon, Edit2, LogOut, Search } from 'lucide-react';
import Avatar from '../components/Avatar';
import MedicalBadge from '../components/MedicalBadge';
import PostCard from '../components/PostCard';
import { CommunityCardSkeleton } from '../components/Skeletons';
import { socket } from '../socket';

import { useConfirm } from '../context/ConfirmContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

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

  // Active Event Details modal state
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [attendees, setAttendees] = useState([]);
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
  const [newEvent, setNewEvent] = useState({ title: '', description: '', event_date: '', location: '' });

  // Resource creation state
  const [showResourceForm, setShowResourceForm] = useState(false);
  const [newResource, setNewResource] = useState({ title: '', content: '', link: '' });

  // Edit states
  const [editingEvent, setEditingEvent] = useState(null);
  const [editingResource, setEditingResource] = useState(null);

  // New items states
  const [hasNewFeed, setHasNewFeed] = useState(false);
  const [hasNewEvents, setHasNewEvents] = useState(false);
  const [hasNewResources, setHasNewResources] = useState(false);

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
      if (updatedId === parseInt(id)) {
        fetchDetail();
        membersPagination.fetchItems(0, false);
      }
    };
    
    const handleEventUpdate = (data) => {
      const updatedId = data?.communityId || data;
      if (parseInt(updatedId) === parseInt(id)) {
        if (data?.action === 'add' && data?.triggerUserId !== user?.id) {
          setHasNewEvents(true);
        } else {
          eventsPagination.fetchItems(0, false);
        }
      }
    };
    
    const handleResourceUpdate = (data) => {
      const updatedId = data?.communityId || data;
      if (parseInt(updatedId) === parseInt(id)) {
        if (data?.action === 'add' && data?.triggerUserId !== user?.id) {
          setHasNewResources(true);
        } else {
          resourcesPagination.fetchItems(0, false);
        }
      }
    };

    const handleFeedUpdate = (data) => {
      const updatedId = data?.communityId || data;
      if (parseInt(updatedId) === parseInt(id)) {
        if (data?.action === 'add' && data?.triggerUserId !== user?.id) {
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
    try {
      await axios.post(`${API_URL}/communities/${id}/events`, newEvent);
      toast.success('Event created!');
      setShowEventForm(false);
      setNewEvent({ title: '', description: '', event_date: '', location: '' });
      fetchDetail();
    } catch (err) {
      toast.error('Failed to create event');
    }
  };

  const handleCreateResource = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/communities/${id}/resources`, newResource);
      toast.success('Resource added!');
      setShowResourceForm(false);
      setNewResource({ title: '', content: '', link: '' });
      fetchDetail();
    } catch (err) {
      toast.error('Failed to add resource');
    }
  };

  const handleUpdateEvent = async (e) => {
    e.preventDefault();
    try {
      // Need to format date properly for input if needed, but it's handled by onChange mostly.
      await axios.put(`${API_URL}/communities/${id}/events/${editingEvent.id}`, editingEvent);
      toast.success('Event updated!');
      setEditingEvent(null);
      fetchDetail();
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
                {hasAccess && (
                  <Link to={`/communities/${id}/create-post`} className="btn-primary py-2 px-4 flex justify-center items-center text-sm shadow-sm">
                    <PlusCircle className="w-4 h-4 mr-1.5" />
                    Create Post
                  </Link>
                )}
              </div>
              {posts.length === 0 && !feedPagination.loading ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
                  <HelpCircle className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No posts found</h3>
                </div>
              ) : (
                <div className="space-y-4">
                  {posts.map(post => (
                    <PostCard 
                      key={post.id} 
                      post={post} 
                      currentUser={user} 
                      onDelete={handleDeletePost} 
                      onVote={feedPagination.fetchItems}
                      hideCommunityName={true}
                    />
                  ))}
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
                    <form onSubmit={handleCreateEvent} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                      <h3 className="font-bold text-gray-900 mb-2">Host an Event</h3>
                      <input type="text" placeholder="Event Title" required className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} />
                      <input type="datetime-local" required className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" value={newEvent.event_date} onChange={e => setNewEvent({...newEvent, event_date: e.target.value})} />
                      <input type="text" placeholder="Location (e.g., Central Park or Zoom link)" required className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" value={newEvent.location} onChange={e => setNewEvent({...newEvent, location: e.target.value})} />
                      <textarea placeholder="Event Description..." className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" rows="3" value={newEvent.description} onChange={e => setNewEvent({...newEvent, description: e.target.value})}></textarea>
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
                      {events.map(event => (
                        <div key={event.id}>
                          {editingEvent?.id === event.id ? (
                            <form onSubmit={handleUpdateEvent} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                              <h3 className="font-bold text-gray-900 mb-2">Edit Event</h3>
                              <input type="text" placeholder="Event Title" required className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" value={editingEvent.title} onChange={e => setEditingEvent({...editingEvent, title: e.target.value})} />
                              <textarea placeholder="Event Description" required className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" rows="3" value={editingEvent.description} onChange={e => setEditingEvent({...editingEvent, description: e.target.value})}></textarea>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <input type="datetime-local" required className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" value={new Date(new Date(editingEvent.event_date).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)} onChange={e => setEditingEvent({...editingEvent, event_date: e.target.value})} />
                                <input type="text" placeholder="Location or Virtual Link" required className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" value={editingEvent.location} onChange={e => setEditingEvent({...editingEvent, location: e.target.value})} />
                              </div>
                              <div className="flex space-x-3">
                                <button type="submit" className="btn-primary flex-1 py-2">Save Changes</button>
                                <button type="button" onClick={() => setEditingEvent(null)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition-colors">Cancel</button>
                              </div>
                            </form>
                          ) : (
                            <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col md:flex-row md:items-center justify-between shadow-sm hover:shadow-md transition-shadow relative">
                              {(isAdmin || event.created_by === user?.id) && (
                                <div className="absolute top-4 right-4 flex space-x-2 z-20">
                                  <button onClick={(e) => { e.stopPropagation(); setEditingEvent(event); }} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); handleDeleteEvent(event.id); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                              <div 
                                onClick={() => {
                                  setSelectedEvent(event);
                                  fetchAttendees(event.id);
                                }}
                                className="flex-1 mb-4 md:mb-0 cursor-pointer group pr-16"
                              >
                                <h3 className="text-lg font-bold text-gray-900 group-hover:text-primary-600 transition-colors">{event.title}</h3>
                                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{event.description}</p>
                                <div className="flex flex-wrap items-center mt-3 text-xs text-gray-500 space-x-4">
                                  <span className="flex items-center text-primary-700 font-medium bg-primary-50 px-2 py-1 rounded">
                                    <Calendar className="w-3 h-3 mr-1" />
                                    {new Date(event.event_date).toLocaleString()}
                                  </span>
                                  <span className="flex items-center">
                                    <MapPin className="w-3 h-3 mr-1" />
                                    {event.location}
                                  </span>
                                  <span className="flex items-center">
                                    <Users className="w-3 h-3 mr-1" />
                                    {event.attendee_count} attending
                                  </span>
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
                        </div>
                      ))}
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
                      <input type="url" placeholder="External Link (Optional)" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" value={newResource.link} onChange={e => setNewResource({...newResource, link: e.target.value})} />
                      <textarea placeholder="Resource Content or details..." required className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" rows="4" value={newResource.content} onChange={e => setNewResource({...newResource, content: e.target.value})}></textarea>
                      <button type="submit" className="btn-primary w-full py-2">Publish Resource</button>
                    </form>
                  )}

                  {resources.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
                      <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No resources yet</h3>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {resources.map(res => (
                        <div key={res.id}>
                          {editingResource?.id === res.id ? (
                            <form onSubmit={handleUpdateResource} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                              <h3 className="font-bold text-gray-900 mb-2">Edit Resource</h3>
                              <input type="text" placeholder="Resource Title" required className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm" value={editingResource.title} onChange={e => setEditingResource({...editingResource, title: e.target.value})} />
                              <input type="url" placeholder="External Link (Optional)" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm" value={editingResource.link || ''} onChange={e => setEditingResource({...editingResource, link: e.target.value})} />
                              <textarea placeholder="Resource Content" required className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm" rows="3" value={editingResource.content} onChange={e => setEditingResource({...editingResource, content: e.target.value})}></textarea>
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
                                {res.link && (
                                  <a href={res.link} target="_blank" rel="noreferrer" className="text-primary-600 hover:text-primary-800 p-1 bg-primary-50 rounded">
                                    <ExternalLink className="w-4 h-4" />
                                  </a>
                                )}
                              </h3>
                              <p className="text-sm text-gray-600 mb-4 whitespace-pre-wrap line-clamp-4">{res.content}</p>
                              <div className="text-xs text-gray-400 flex items-center justify-between border-t border-gray-100 pt-3">
                                <span>Added by {res.creator_name}</span>
                                <span>{formatDistanceToNow(new Date(res.created_at))} ago</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      {resourcesPagination.loadingMore && <div className="col-span-1 sm:col-span-2 text-center py-4 text-gray-500 text-sm font-medium">Loading more resources...</div>}
                      {!resourcesPagination.loadingMore && resourcesPagination.hasMore && (
                        <div ref={resourcesPagination.lastElementRef} className="col-span-1 sm:col-span-2 h-4 w-full"></div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* MEMBERS TAB */}
              {activeTab === 'members' && (
                <div className="space-y-6 animate-fade-in">
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
                            {isAdmin && m.role !== 'admin' && (
                              <div className="flex items-center space-x-2 shrink-0 self-start sm:self-auto ml-14 sm:ml-0">
                                <button onClick={() => makeAdmin(m.user_id)} className="text-xs font-bold text-gray-600 hover:text-white hover:bg-primary-600 border border-gray-200 hover:border-primary-600 rounded-lg px-3 py-1.5 transition-all shadow-sm">
                                  Make Admin
                                </button>
                                <button onClick={() => removeMember(m.user_id, m.username)} className="text-xs font-bold text-red-600 hover:text-white hover:bg-red-600 border border-red-200 hover:border-red-600 rounded-lg px-3 py-1.5 transition-all shadow-sm">
                                  Remove
                                </button>
                              </div>
                            )}
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
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-150 relative animate-scale-in">
            {/* Modal Header banner */}
            <div className="h-4 bg-gradient-to-r from-primary-500 to-emerald-500 w-full" />
            
            {/* Modal Body */}
            <div className="p-6 sm:p-8 space-y-6">
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
                <div className="flex items-center text-gray-700">
                  <MapPin className="w-4 h-4 mr-2 text-red-500" />
                  <span>{selectedEvent.location}</span>
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
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-400">Who's Coming ({attendees.length})</h4>
                
                {loadingAttendees ? (
                  <div className="flex justify-center items-center py-6">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                  </div>
                ) : attendees.length === 0 ? (
                  <div className="text-center py-6 bg-gray-50/50 rounded-2xl border border-dashed border-gray-150">
                    <p className="text-xs text-gray-400 font-medium">No RSVPs yet. Be the first to join!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                    {attendees.map(member => (
                      <div key={member.id} className="flex items-center space-x-2.5 p-2 rounded-xl bg-gray-50/50 border border-gray-100">
                        <Link to={`/user/${member.id}`} onClick={() => setSelectedEvent(null)} className="shrink-0 hover:opacity-85 transition-opacity">
                          <Avatar src={member.profile_picture} name={member.username} size="w-8 h-8" />
                        </Link>
                        <div className="min-w-0 flex-1">
                          <Link 
                            to={`/user/${member.id}`} 
                            onClick={() => setSelectedEvent(null)}
                            className="text-xs font-bold text-gray-800 hover:text-primary-600 transition-colors truncate block flex items-center"
                          >
                            {member.username}
                            <MedicalBadge isMedicalProfessional={member.is_medical_professional} className="w-3.5 h-3.5 ml-1 shrink-0" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
