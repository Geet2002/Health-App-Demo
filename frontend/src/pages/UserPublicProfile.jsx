import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';
import { User, Calendar, MapPin, HelpCircle, ArrowLeft } from 'lucide-react';
import Avatar from '../components/Avatar';
import MedicalBadge from '../components/MedicalBadge';
import PostCard from '../components/PostCard';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export default function UserPublicProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If user clicks their own profile, redirect to the private /profile page
    if (currentUser && currentUser.id === parseInt(id)) {
      navigate('/profile');
      return;
    }

    const fetchProfile = async () => {
      try {
        const response = await axios.get(`${API_URL}/users/${id}/public`);
        setProfileData(response.data);
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [id, currentUser, navigate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-300">
        <User className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-bold text-gray-900">User not found</h3>
      </div>
    );
  }

  const { user, recent_posts } = profileData;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in pb-12">
      <button onClick={() => navigate(-1)} className="inline-flex items-center text-gray-500 hover:text-primary-600 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back
      </button>

      {/* Profile Header */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-primary-400 to-blue-500"></div>
        <div className="px-8 pb-8 relative">
          <div className="flex justify-between items-end -mt-12 mb-6">
            <div className="w-24 h-24 rounded-full border-4 border-white bg-white overflow-hidden shadow-sm">
              <Avatar src={user.profile_picture} name={user.username} size="w-full h-full" />
            </div>
          </div>
          
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 flex items-center">
              {user.username}
              <MedicalBadge isMedicalProfessional={user.is_medical_professional} className="w-6 h-6 ml-2 text-blue-600" />
            </h1>
            <p className="text-gray-500 flex items-center mt-2">
              <Calendar className="w-4 h-4 mr-1.5" />
              Joined {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
            </p>
          </div>

          {user.description && (
            <div className="mt-6 pt-6 border-t border-gray-100 text-gray-700 leading-relaxed">
              {user.description}
            </div>
          )}
        </div>
      </div>

      {/* Recent Public Posts */}
      <div className="space-y-4 mt-8">
        <h2 className="text-xl font-bold text-gray-900 px-2">Recent Public Activity</h2>
        
        {recent_posts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <HelpCircle className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-2 text-gray-500">No public posts yet.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {recent_posts.map((post) => (
              <PostCard key={post.id} post={post} currentUser={currentUser} onDelete={() => {}} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
