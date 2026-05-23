import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { Shield, Users, Lock, Unlock, Check, X, ShieldAlert, Trash2, MessageCircle, MapPin, Clock, AlertTriangle, HelpCircle, PlusCircle, Calendar, BookOpen, ExternalLink, Link as LinkIcon } from 'lucide-react';
import Avatar from '../components/Avatar';
import MedicalBadge from '../components/MedicalBadge';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export default function CommunityDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [comm, setComm] = useState(null);
  const [posts, setPosts] = useState([]);
  const [events, setEvents] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('feed'); // feed, events, resources, members

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

  const handleRequest = async (userId, action) => {
    try {
      await axios.post(`${API_URL}/communities/${id}/requests/${userId}`, { action });
      fetchDetail();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Error updating request');
    }
  };

  const makeAdmin = async (targetUserId) => {
    if(!window.confirm('Make this user an admin?')) return;
    try {
      await axios.post(`${API_URL}/communities/${id}/admin`, { targetUserId });
      fetchDetail();
    } catch (err) {
      toast.error('Error promoting to admin');
    }
  };

  const handleDeleteCommunity = async () => {
    if(!window.confirm('Are you ABSOLUTELY sure? This will permanently delete the community and all related members/posts/data!')) return;
    try {
      await axios.delete(`${API_URL}/communities/${id}`);
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
      toast.success(!currentlyAttending ? 'RSVP Confirmed!' : 'RSVP Cancelled');
    } catch (err) {
      toast.error('Error updating RSVP');
    }
  };

  if (loading) return <div className="text-center py-12">Loading...</div>;
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

      {hasAccess ? (
        <>
          {/* Tabs Navigation */}
          <div className="flex space-x-1 bg-white p-1 rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
            {['feed', 'events', 'resources', 'members'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
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
                                <span className="font-medium text-gray-900 mr-1 flex items-center">
                                  {post.author_name}
                                  <MedicalBadge isMedicalProfessional={post.is_medical_professional} />
                                </span>
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
                          <div className="flex-1 mb-4 md:mb-0">
                            <h3 className="text-lg font-bold text-gray-900">{event.title}</h3>
                            <p className="text-sm text-gray-600 mt-1">{event.description}</p>
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
                          <div className="md:ml-6 flex-shrink-0">
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
    </div>
  );
}
