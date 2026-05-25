import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { Shield, Users, Lock, Unlock, Check, X, ShieldAlert, Trash2, MessageCircle, MapPin, Clock, AlertTriangle, HelpCircle, PlusCircle, Calendar, BookOpen, ExternalLink, Link as LinkIcon, Edit2, LogOut } from 'lucide-react';
import Avatar from '../components/Avatar';
import MedicalBadge from '../components/MedicalBadge';
import PostCard from '../components/PostCard';
import { CommunityCardSkeleton } from '../components/Skeletons';

import { useConfirm } from '../context/ConfirmContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export default function CommunityDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [searchParams, setSearchParams] = useSearchParams();
  const [comm, setComm] = useState(null);
  const [posts, setPosts] = useState([]);
  const [events, setEvents] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'feed'); // feed, events, resources, members

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

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    try {
      const res = await axios.get(`${API_URL}/communities/${id}`);
      setComm(res.data);
      setEditForm({ name: res.data.name, description: res.data.description || '' });
      const postRes = await axios.get(`${API_URL}/communities/${id}/posts`);
      setPosts(postRes.data);
      const eventRes = await axios.get(`${API_URL}/communities/${id}/events`);
      setEvents(eventRes.data);
      const resRes = await axios.get(`${API_URL}/communities/${id}/resources`);
      setResources(resRes.data);
    } catch (err) {
      if (err.response?.status === 404) navigate('/communities');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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

  const handleRequest = async (userId, action) => {
    try {
      await axios.post(`${API_URL}/communities/${id}/requests/${userId}`, { action });
      fetchDetail();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Error updating request');
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
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in relative pb-12">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-200 object-cover relative overflow-hidden">
        <div className={`absolute top-0 left-0 w-2 h-full ${comm.is_private ? 'bg-orange-500' : 'bg-primary-500'}`} />
        <div className="flex justify-between items-start">
          <div className="flex-1 mr-4">
            <div className="flex items-center space-x-3 mb-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${comm.is_private ? 'bg-orange-100 text-orange-800' : 'bg-primary-100 text-primary-800'}`}>
                {comm.is_private ? <Lock className="w-3 h-3 mr-1"/> : <Unlock className="w-3 h-3 mr-1"/>}
                {comm.is_private ? 'Private' : 'Public'}
              </span>
              <span className="text-sm text-gray-500">Created by {comm.creator_name}</span>
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
                <h1 className="text-3xl font-extrabold text-gray-900 mt-2">{comm.name}</h1>
                <p className="text-gray-600 mt-4 text-lg max-w-2xl">{comm.description}</p>
              </>
            )}
          </div>
          <div className="flex flex-col items-end space-y-3">
            {(user?.is_admin !== 1 && user?.is_admin !== true) && !myMembership && (
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
              <div className="flex space-x-2">
                <span className="px-4 py-2 bg-green-100 text-green-800 rounded-lg font-medium border border-green-200 flex items-center">
                  <Check className="w-4 h-4 mr-1"/> Member
                </span>
                {!isCreator && (
                  <button 
                    onClick={handleLeaveCommunity} 
                    className="flex items-center text-sm font-semibold text-gray-400 hover:text-white hover:bg-red-500 border border-gray-200 hover:border-red-500 px-3 py-1.5 rounded-lg transition-all shadow-sm group"
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
                className="flex items-center text-sm font-semibold text-primary-600 hover:text-white hover:bg-primary-600 border border-primary-250 px-3 py-1.5 rounded-lg transition-colors mt-2 shadow-sm"
              >
                <Edit2 className="w-4 h-4 mr-1" /> Edit Details
              </button>
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

      {hasAccess ? (
        <>
          {/* Tabs Navigation */}
          <div className="flex space-x-1 bg-white p-1 rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
            {['feed', 'events', 'resources', 'members'].map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`flex-1 py-2.5 px-4 text-sm font-semibold rounded-lg capitalize flex justify-center items-center whitespace-nowrap transition-colors ${
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
                <div className="space-y-6 animate-fade-in">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold flex items-center">Recent Posts</h2>
                    {(user?.is_admin !== 1 && user?.is_admin !== true) && (
                      <Link to={`/create?communityId=${id}`} className="btn-primary py-2 px-4 flex items-center text-sm">
                        <PlusCircle className="w-4 h-4 mr-1.5" />
                        Create Post
                      </Link>
                    )}
                  </div>
                  {posts.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
                      <HelpCircle className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No posts yet</h3>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {posts.map(post => (
                        <PostCard 
                          key={post.id} 
                          post={post} 
                          currentUser={user} 
                          onDelete={handleDeletePost} 
                          onVote={fetchDetail}
                          hideCommunityName={true}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* EVENTS TAB */}
              {activeTab === 'events' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold flex items-center">Upcoming Events</h2>
                    {isAdmin && (
                      <button onClick={() => setShowEventForm(!showEventForm)} className="btn-primary py-2 px-4 flex items-center text-sm">
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
                        <div key={event.id} className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col md:flex-row md:items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                          <div 
                            onClick={() => {
                              setSelectedEvent(event);
                              fetchAttendees(event.id);
                            }}
                            className="flex-1 mb-4 md:mb-0 cursor-pointer group"
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
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* RESOURCES TAB */}
              {activeTab === 'resources' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold flex items-center">Community Resources</h2>
                    {isAdmin && (
                      <button onClick={() => setShowResourceForm(!showResourceForm)} className="btn-primary py-2 px-4 flex items-center text-sm">
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
                        <div key={res.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:border-primary-300 transition-colors">
                          <h3 className="font-bold text-gray-900 mb-2 flex items-start justify-between">
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
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* MEMBERS TAB */}
              {activeTab === 'members' && (
                <div className="space-y-6 animate-fade-in">
                  <h2 className="text-xl font-bold flex items-center">Members ({approvedMembers.length})</h2>
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <ul className="divide-y divide-gray-100">
                      {approvedMembers.map(m => (
                        <li key={m.user_id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                          <div className="flex items-center">
                            <div className="w-10 h-10 mr-4">
                              <Avatar src={m.profile_picture} name={m.username} size="w-10 h-10" />
                            </div>
                            <div>
                              <div className="flex items-center">
                                <span className="font-semibold text-gray-900">{m.username}</span>
                                <MedicalBadge isMedicalProfessional={m.is_medical_professional} />
                              </div>
                              {m.role === 'admin' && <span className="text-xs font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full border border-primary-200 mt-1 inline-block">Admin</span>}
                            </div>
                          </div>
                          {isAdmin && m.role !== 'admin' && (
                            <button onClick={() => makeAdmin(m.user_id)} className="text-xs font-medium text-gray-600 hover:text-primary-700 hover:bg-primary-50 border border-gray-300 rounded px-3 py-1.5 transition-colors">
                              Make Admin
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar content */}
            <div className="space-y-6">
              {isAdmin && comm.is_private && pendingRequests.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold flex items-center text-orange-700 bg-orange-50 p-3 rounded-lg border border-orange-100">
                    <ShieldAlert className="mr-2 w-5 h-5"/> Pending Requests
                  </h2>
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
                </div>
              )}

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
