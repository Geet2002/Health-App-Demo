import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';
import { 
  User, Calendar, MapPin, HelpCircle, ArrowLeft, Users, 
  CheckCircle, Award, Activity, Heart, TrendingUp, Sparkles 
} from 'lucide-react';
import Avatar from '../components/Avatar';
import MedicalBadge from '../components/MedicalBadge';
import PostCard from '../components/PostCard';
import { useAuth } from '../context/AuthContext';
import { ProfileSkeleton } from '../components/Skeletons';

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
    return <ProfileSkeleton />;
  }

  if (!profileData) {
    return (
      <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-300">
        <User className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-bold text-gray-900">User not found</h3>
      </div>
    );
  }

  const { user, recent_posts, stats, communities } = profileData;

  // Reputation Points System logic
  const myPostsCount = stats?.posts_count || 0;
  const myUpvotesCount = stats?.upvotes_count || 0;
  const reputationPoints = (myPostsCount * 10) + (myUpvotesCount * 25);

  let levelName = 'Care Supporter';
  let nextLevelPoints = 100;
  let progressPercent = 0;

  if (reputationPoints < 50) {
    levelName = 'Community Helper';
    nextLevelPoints = 50;
    progressPercent = (reputationPoints / 50) * 100;
  } else if (reputationPoints < 200) {
    levelName = 'Health Advocate';
    nextLevelPoints = 200;
    progressPercent = ((reputationPoints - 50) / 150) * 100;
  } else {
    levelName = 'Life Saver';
    nextLevelPoints = 500;
    progressPercent = Math.min((reputationPoints / 500) * 100, 100);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in pb-12 pt-4 px-4 sm:px-0">
      {/* Modern Main Profile Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm relative overflow-hidden">
        
        {/* Back Button Integrated Inside Card */}
        <div className="flex items-center justify-start mb-6">
          <button onClick={() => navigate(-1)} className="inline-flex items-center text-gray-500 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-xl transition-colors text-sm font-bold">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back
          </button>
        </div>

        {/* Header (Avatar & Info) */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full ring-4 ring-gray-50 ring-offset-2 overflow-hidden shadow-sm shrink-0">
            <Avatar src={user.profile_picture} name={user.username} size="w-full h-full" />
          </div>
          
          <div className="text-center sm:text-left flex-1 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 flex items-center justify-center sm:justify-start">
                  {user.username}
                  <MedicalBadge isMedicalProfessional={user.is_medical_professional} className="w-6 h-6 ml-2 text-blue-600" />
                </h1>
                <p className="text-gray-400 flex items-center justify-center sm:justify-start text-xs font-semibold uppercase tracking-wider mt-1.5">
                  <Calendar className="w-3.5 h-3.5 mr-1.5" />
                  Joined {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                </p>
              </div>

              {user.is_medical_professional === 1 && (
                <span className="inline-flex items-center px-3 py-1.5 bg-blue-50/50 text-[10px] font-black tracking-widest uppercase text-blue-600 rounded-full self-center sm:self-start">
                  <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                  Verified
                </span>
              )}
            </div>

            {user.description && (
              <p className="text-gray-600 text-sm leading-relaxed max-w-xl mt-4 bg-gray-50/50 p-4 rounded-2xl">{user.description}</p>
            )}
          </div>
        </div>

        {/* Minimal Reputation Section */}
        {!user.is_admin && (
          <div className="pt-8 border-t border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider">Community Standing</h3>
              <span className="font-extrabold text-[10px] text-primary-700 bg-primary-50 px-3 py-1 rounded-full uppercase tracking-widest border border-primary-100">
                {levelName}
              </span>
            </div>
            
            <div className="space-y-2.5">
              <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div className="bg-primary-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${progressPercent}%` }}></div>
              </div>
              <div className="flex items-center justify-between text-xs font-bold text-gray-400">
                <span className="text-primary-600">{reputationPoints} Points</span>
                <span>{nextLevelPoints} pts for next rank</span>
              </div>
            </div>
          </div>
        )}

        {/* Minimal Stats Grid */}
        <div className="grid grid-cols-3 gap-3 sm:gap-6 pt-6 border-t border-gray-100">
          <div className="flex flex-col items-center justify-center p-4 bg-gray-50/50 rounded-2xl">
            <span className="text-2xl font-black text-gray-900 mb-1">{myPostsCount}</span>
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider text-center">Posts</span>
          </div>
          <div className="flex flex-col items-center justify-center p-4 bg-gray-50/50 rounded-2xl">
            <span className="text-2xl font-black text-gray-900 mb-1">{myUpvotesCount}</span>
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider text-center">Upvotes</span>
          </div>
          {!user.is_admin && (
            <div className="flex flex-col items-center justify-center p-4 bg-gray-50/50 rounded-2xl">
              <span className="text-2xl font-black text-gray-900 mb-1">{reputationPoints}</span>
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider text-center">Score</span>
            </div>
          )}
        </div>
      </div>

      {/* Communities Joined */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-5">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center">
          <Users className="w-4 h-4 mr-2 text-gray-400" />
          Communities ({communities.length})
        </h2>
        
        {communities.length === 0 ? (
          <div className="text-center py-6 text-sm text-gray-400 font-medium">Not part of any communities yet.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {communities.map((comm) => (
              <Link key={comm.id} to={`/communities/${comm.id}`} className="flex items-center space-x-3 p-3 rounded-2xl hover:bg-gray-50 transition-colors group">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-extrabold shrink-0 uppercase group-hover:bg-primary-100 group-hover:text-primary-700 transition-colors">
                  {comm.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-extrabold text-gray-900 truncate group-hover:text-primary-600">{comm.name}</h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide mt-0.5">Member</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="space-y-4 pt-4">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center px-2">
          <Activity className="w-4 h-4 mr-2 text-gray-400" />
          Recent Activity
        </h2>
        
        {recent_posts.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <p className="text-gray-400 font-medium text-sm">No public activity yet.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {recent_posts.map((post) => (
              <PostCard key={post.id} post={post} currentUser={currentUser} onDelete={() => {}} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
