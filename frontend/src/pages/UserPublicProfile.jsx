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
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in pb-12">
      <button onClick={() => navigate(-1)} className="inline-flex items-center text-gray-500 hover:text-primary-600 transition-colors text-sm font-semibold">
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back
      </button>

      {/* Profile Header Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-150 overflow-hidden relative">
        <div className="h-32 bg-gradient-to-r from-primary-500 via-emerald-500 to-teal-600 relative">
          <div className="absolute inset-0 bg-white/5 opacity-50"></div>
        </div>
        
        <div className="px-6 sm:px-8 pb-8 relative">
          {/* Avatar Positioning */}
          <div className="flex justify-between items-end -mt-12 mb-6">
            <div className="w-24 h-24 rounded-full border-4 border-white bg-white overflow-hidden shadow-md">
              <Avatar src={user.profile_picture} name={user.username} size="w-full h-full" />
            </div>
            {user.is_medical_professional === 1 && (
              <span className="px-3 py-1 bg-primary-50 border border-primary-100 text-[10px] font-extrabold text-primary-700 rounded-full flex items-center" title="Verified Professional">
                <CheckCircle className="w-3.5 h-3.5 mr-1" />
                Verified Professional
              </span>
            )}
          </div>
          
          {/* Bio Info */}
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 flex items-center">
              {user.username}
              <MedicalBadge isMedicalProfessional={user.is_medical_professional} className="w-6 h-6 ml-2 text-blue-600" />
            </h1>
            <p className="text-gray-400 flex items-center text-xs font-semibold uppercase tracking-wider">
              <Calendar className="w-4 h-4 mr-1.5 text-gray-400" />
              Joined {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
            </p>
          </div>

          {user.description && (
            <div className="mt-5 pt-5 border-t border-gray-100 text-gray-700 text-sm sm:text-base leading-relaxed">
              <p className="italic">"{user.description}"</p>
            </div>
          )}

          {/* Gamified Reputation & Contributor Stats Section */}
          <div className="mt-8 pt-8 border-t border-gray-100">
            {!user.is_admin && (
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl p-6 sm:p-8 mb-6 border border-emerald-100/50 relative overflow-hidden">
                {/* Decorative background circle */}
                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-emerald-200/40 rounded-full blur-2xl"></div>
                
                <div className="relative z-10">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 bg-white rounded-2xl shadow-sm text-emerald-500">
                        <Award className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-black text-gray-900 text-lg">Community Reputation</h3>
                        <p className="text-emerald-700/80 text-xs font-semibold">Keep helping others to rank up!</p>
                      </div>
                    </div>
                    <span className="font-extrabold text-xs text-white bg-emerald-500 px-4 py-1.5 rounded-full uppercase tracking-wider self-start sm:self-auto shadow-md">
                      {levelName}
                    </span>
                  </div>

                  {/* Level slider */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-bold text-gray-500 mb-1">
                      <span className="flex items-center text-emerald-700">
                        <Sparkles className="w-3.5 h-3.5 mr-1" />
                        {reputationPoints} Points
                      </span>
                      <span>{nextLevelPoints} pts for next rank</span>
                    </div>
                    <div className="w-full bg-white/60 rounded-full h-3 overflow-hidden shadow-inner border border-emerald-100/50">
                      <div className="bg-gradient-to-r from-emerald-400 to-teal-500 h-full rounded-full transition-all duration-1000 ease-out relative" style={{ width: `${progressPercent}%` }}>
                        <div className="absolute inset-0 bg-white/20 w-full animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Stat counts grid */}
            <div className={`grid gap-4 sm:gap-6 ${user.is_admin ? 'grid-cols-2' : 'grid-cols-3'}`}>
              <div className="group bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-blue-50 text-blue-500 rounded-xl group-hover:bg-blue-500 group-hover:text-white transition-colors">
                    <Activity className="w-5 h-5" />
                  </div>
                  <span className="text-2xl sm:text-3xl font-black text-gray-900">{myPostsCount}</span>
                </div>
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Posts Shared</span>
              </div>

              <div className="group bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-rose-50 text-rose-500 rounded-xl group-hover:bg-rose-500 group-hover:text-white transition-colors">
                    <Heart className="w-5 h-5" />
                  </div>
                  <span className="text-2xl sm:text-3xl font-black text-gray-900">{myUpvotesCount}</span>
                </div>
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Upvotes Gained</span>
              </div>

              {!user.is_admin && (
                <div className="group bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 bg-indigo-50 text-indigo-500 rounded-xl group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <span className="text-2xl sm:text-3xl font-black text-gray-900">{reputationPoints}</span>
                  </div>
                  <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total Score</span>
                </div>
              )}
            </div>
          </div>
          
        </div>
      </div>

      {/* Communities Joined Card */}
      <div className="bg-white rounded-3xl p-6 border border-gray-150 shadow-sm space-y-4">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center">
          <Users className="w-5 h-5 mr-2 text-primary-500" />
          Communities Joined ({communities.length})
        </h2>
        
        {communities.length === 0 ? (
          <div className="text-center py-8 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
            <p className="text-sm text-gray-400 font-medium">This user is not part of any communities yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {communities.map((comm) => (
              <Link 
                key={comm.id} 
                to={`/communities/${comm.id}`} 
                className="flex items-center space-x-3.5 p-3.5 rounded-2xl bg-gray-50/50 hover:bg-gray-100/80 border border-gray-100 hover:border-gray-200 transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-extrabold shrink-0 uppercase border border-primary-200 shadow-sm group-hover:bg-primary-200 group-hover:text-primary-700 transition-colors">
                  {comm.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-extrabold text-gray-800 truncate group-hover:text-primary-600 transition-colors">{comm.name}</h4>
                  <p className="text-[10px] text-gray-400 font-bold truncate mt-0.5 uppercase tracking-wide">Community Member</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent Public Activity Feed */}
      <div className="space-y-4 mt-8">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 px-2 flex items-center">
          <Activity className="w-5 h-5 mr-2 text-primary-500" />
          Recent Public Activity
        </h2>
        
        {recent_posts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-gray-150 shadow-sm p-6">
            <HelpCircle className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-2 text-gray-400 font-medium">No public activity to display yet.</p>
          </div>
        ) : (
          <div className="grid gap-5">
            {recent_posts.map((post) => (
              <PostCard key={post.id} post={post} currentUser={currentUser} onDelete={() => {}} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
