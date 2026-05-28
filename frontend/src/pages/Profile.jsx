import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Camera, User as UserIcon, Calendar, Info, Users, ShieldCheck, BadgeCheck, ShieldMinus, Clock, LogOut, ChevronRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { ProfileSkeleton } from '../components/Skeletons';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export default function Profile() {
  const navigate = useNavigate();
  const { user, checkUser, logout } = useAuth();
  const confirm = useConfirm();
  const [profile, setProfile] = useState({
    birthdate: '',
    description: '',
    gender: '',
    profile_picture: null,
    is_medical_professional: false,
    medical_verification_status: 'none'
  });
  const [initialProfile, setInitialProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ posts_count: 0, upvotes_count: 0 });
  
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${API_URL}/users/profile`);
      const data = res.data;
      const profileData = {
        birthdate: data.birthdate ? new Date(data.birthdate).toISOString().split('T')[0] : '',
        description: data.description || '',
        gender: data.gender || '',
        profile_picture: data.profile_picture || null,
        is_medical_professional: !!data.is_medical_professional,
        medical_verification_status: data.medical_verification_status || 'none'
      };
      setProfile(profileData);
      setInitialProfile(profileData);
      if (data.profile_picture) {
        setImagePreview(data.profile_picture.startsWith('http') ? data.profile_picture : `${API_URL.replace('/api', '')}${data.profile_picture}`);
      }
      
      // Fetch public stats for reputation
      try {
        const publicRes = await axios.get(`${API_URL}/users/${data.id}/public`);
        if (publicRes.data?.stats) {
          setStats(publicRes.data.stats);
        }
      } catch (err) {
        console.error("Failed to fetch public stats", err);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    const formData = new FormData();
    formData.append('birthdate', profile.birthdate);
    formData.append('description', profile.description);
    formData.append('gender', profile.gender);
    if (imageFile) {
      formData.append('profile_picture', imageFile);
    }

    try {
      await axios.put(`${API_URL}/users/profile`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Profile updated successfully!');
      
      // Update global auth state and local profile state without reloading the page
      await checkUser();
      await fetchProfile();
      
      // Reset imageFile so the save button correctly disables if no other changes were made
      setImageFile(null);
    } catch (err) {
      toast.error('Failed to update profile.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleMedical = async () => {
    // Only allow requesting if status is none or rejected
    if (profile.medical_verification_status === 'pending' || profile.medical_verification_status === 'approved') return;
    
    try {
      await axios.post(`${API_URL}/users/me/verify-medical`, { is_medical_professional: true });
      setProfile(p => ({ ...p, medical_verification_status: 'pending' }));
      toast.success('Verification Request Submitted');
    } catch (err) {
      toast.error('Failed to submit request');
    }
  };

  const handleCancelRequest = async () => {
    try {
      await axios.post(`${API_URL}/users/me/verify-medical`, { is_medical_professional: false });
      setProfile(p => ({ ...p, medical_verification_status: 'none' }));
      setShowCancelPrompt(false);
      toast.success('Verification Request Cancelled');
    } catch (err) {
      toast.error('Failed to cancel request');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  const hasFormChanged = () => {
    if (!initialProfile) return false;
    if (imageFile) return true;
    return (
      profile.birthdate !== initialProfile.birthdate ||
      profile.description !== initialProfile.description ||
      profile.gender !== initialProfile.gender
    );
  };

  if (loading) return <ProfileSkeleton />;

  return (
    <div className="max-w-md md:max-w-5xl lg:max-w-6xl mx-auto space-y-4 sm:space-y-6 animate-fade-in pb-32 px-4 pt-0 sm:pt-6 min-h-screen">
      <div className="flex flex-row items-center justify-between gap-4 mb-4 sm:mb-8 mt-0 sm:mt-2">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <button onClick={() => navigate(-1)} className="p-2 sm:-ml-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-900" title="Go Back">
             <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <div className="bg-primary-100 p-1.5 sm:p-2.5 rounded-xl sm:rounded-2xl shrink-0">
            <UserIcon className="w-5 h-5 sm:w-8 sm:h-8 text-primary-600" />
          </div>
          <h1 className="text-xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Profile</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-6 md:gap-10 md:items-start">
        <div className="w-full md:w-5/12 lg:w-4/12 shrink-0 md:sticky md:top-24">
        
        {/* Invisible spacer to align with right column's h3 heading */}
        <h3 className="text-xs font-bold text-transparent uppercase tracking-wider mb-2 ml-2 hidden md:block select-none" aria-hidden="true">
          Profile
        </h3>

        {/* Top Profile Card */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-gray-100 flex flex-col space-y-5 relative">
          <div 
            className="flex items-center cursor-pointer group"
            onClick={() => fileInputRef.current.click()}
          >
            <div className="relative shrink-0">
               <div className="w-16 h-16 rounded-full overflow-hidden bg-primary-50 ring-2 ring-primary-500 group-hover:ring-primary-600 transition-all flex items-center justify-center">
                 {imagePreview ? (
                   <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                 ) : (
                   <span className="text-2xl font-bold text-primary-500">{user?.username?.[0]?.toUpperCase()}</span>
                 )}
               </div>
               <div className="absolute bottom-0 right-0 bg-primary-600 p-1.5 rounded-full text-white shadow-sm border-2 border-white group-hover:scale-110 transition-transform">
                 <Camera className="w-3 h-3" />
               </div>
            </div>
            <div className="ml-4 overflow-hidden">
              <h2 className="text-xl font-bold text-gray-900 truncate">{user?.username}</h2>
              <p className="text-sm text-gray-500 truncate">{user?.email || 'No email provided'}</p>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleImageChange} 
            />
          </div>

          <div className="border-t border-gray-100 pt-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Reputation Level</span>
              <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-widest border border-emerald-100">
                {(() => {
                  const pts = (stats.posts_count * 10) + (stats.upvotes_count * 25);
                  if (pts < 50) return 'Community Helper';
                  if (pts < 200) return 'Health Advocate';
                  return 'Life Saver';
                })()}
              </span>
            </div>
            <div className="space-y-2 mb-5">
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-1000 ease-out" 
                  style={{ 
                    width: `${(() => {
                      const pts = (stats.posts_count * 10) + (stats.upvotes_count * 25);
                      if (pts < 50) return (pts / 50) * 100;
                      if (pts < 200) return ((pts - 50) / 150) * 100;
                      return Math.min((pts / 500) * 100, 100);
                    })()}%` 
                  }}
                ></div>
              </div>
              <div className="flex items-center justify-between text-xs font-bold text-gray-400">
                <span>{(stats.posts_count * 10) + (stats.upvotes_count * 25)} Points</span>
                <span>Next Level: {(() => {
                  const pts = (stats.posts_count * 10) + (stats.upvotes_count * 25);
                  if (pts < 50) return 50;
                  if (pts < 200) return 200;
                  return 500;
                })()} pts</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="flex flex-col items-center justify-center p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                <span className="text-2xl font-black text-gray-900 mb-1">{stats.posts_count}</span>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider text-center">Posts Shared</span>
              </div>
              <div className="flex flex-col items-center justify-center p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                <span className="text-2xl font-black text-emerald-600 mb-1">{stats.upvotes_count}</span>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider text-center">Upvotes Gained</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {stats.posts_count > 0 && (
                <span className="text-[10px] font-extrabold px-3 py-1 rounded-md uppercase tracking-wider border bg-emerald-50 text-emerald-600 border-emerald-200">
                  Active Contributor
                </span>
              )}
              {stats.upvotes_count > 0 && (
                <span className="text-[10px] font-extrabold px-3 py-1 rounded-md uppercase tracking-wider border bg-amber-50 text-amber-700 border-amber-200">
                  Highly Appreciated
                </span>
              )}
            </div>
            
            <div className="pt-5 mt-5 space-y-2 border-t border-gray-100">
              <button 
                type="button"
                onClick={() => {
                  document.getElementById('settings-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full flex items-center justify-between p-3.5 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-colors"
              >
                <span className="text-sm font-bold text-gray-700">Manage Profile Settings</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
              <Link 
                to="/communities" 
                className="w-full flex items-center justify-between p-3.5 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-colors"
              >
                <span className="text-sm font-bold text-gray-700">Explore Communities</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </Link>
            </div>
          </div>
        </div>
        </div>
        
        <div className="w-full md:w-7/12 lg:w-8/12 space-y-5 sm:space-y-6">
        <div id="settings-section" className="pt-0 md:hidden"></div>

        {/* Verification Section */}
        {!user?.is_admin && (
           <div>
             <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-2">Verification</h3>
             <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
               <div className="flex items-center">
                  <div className="bg-blue-50 p-2 rounded-xl mr-3 shrink-0">
                    <ShieldCheck className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <span className="font-bold text-gray-900 block text-sm">Medical Professional</span>
                    {profile.medical_verification_status === 'approved' && (
                      <span className="text-xs font-bold text-blue-600">Verified</span>
                    )}
                    {profile.medical_verification_status === 'rejected' && (
                      <span className="text-xs font-bold text-red-600">Rejected</span>
                    )}
                  </div>
               </div>
               
               <div>
                  {profile.medical_verification_status === 'approved' ? (
                    <button 
                      type="button"
                      onClick={async (e) => {
                        e.preventDefault();
                        const isConfirmed = await confirm({
                          title: 'Remove Verification?',
                          message: 'Are you sure you want to remove your medical verification status?',
                          confirmText: 'Remove',
                          cancelText: 'Keep Status',
                          type: 'danger'
                        });
                        if (isConfirmed) {
                          try {
                            await axios.post(`${API_URL}/users/me/verify-medical`, { is_medical_professional: false });
                            setProfile(p => ({ ...p, is_medical_professional: false, medical_verification_status: 'none' }));
                            toast.success('Verification removed');
                          } catch (err) {
                            toast.error('Failed to remove verification');
                          }
                        }
                      }}
                      className="px-3 py-1.5 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-colors text-xs flex items-center w-full sm:w-auto justify-center"
                    >
                      <ShieldMinus className="w-3.5 h-3.5 mr-1" /> Remove
                    </button>
                  ) : profile.medical_verification_status === 'pending' ? (
                     showCancelPrompt ? (
                       <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                         <button type="button" onClick={handleCancelRequest} className="px-4 py-2 text-xs rounded-xl font-bold bg-red-500 text-white flex-1 sm:flex-none whitespace-nowrap shadow-sm hover:bg-red-600 transition-colors">Yes, Cancel</button>
                         <button type="button" onClick={() => setShowCancelPrompt(false)} className="px-4 py-2 text-xs rounded-xl font-bold bg-gray-100 hover:bg-gray-200 transition-colors text-gray-700 sm:flex-none shadow-sm">Back</button>
                       </div>
                     ) : (
                       <button type="button" onClick={() => setShowCancelPrompt(true)} className="px-3 py-1.5 rounded-xl font-bold bg-yellow-50 text-yellow-700 flex items-center text-xs w-full sm:w-auto justify-center">
                         <Clock className="w-3.5 h-3.5 mr-1" /> Pending
                       </button>
                     )
                  ) : (
                    <button type="button" onClick={handleToggleMedical} className="px-4 py-2 text-xs rounded-xl font-bold bg-gray-900 text-white w-full sm:w-auto">
                      Request
                    </button>
                  )}
               </div>
             </div>
           </div>
        )}

        {/* Personal Details Section */}
        {!user?.is_admin && (
           <div>
             <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-2">Personal Details</h3>
             <div className="bg-white rounded-3xl shadow-sm border border-gray-100 divide-y divide-gray-100 overflow-hidden">
               
               {/* Bio */}
               <div className="p-4">
                  <div className="flex items-center mb-3">
                     <div className="bg-gray-50 p-2 rounded-xl mr-3">
                       <Info className="w-5 h-5 text-gray-600" />
                     </div>
                     <span className="font-bold text-gray-900 text-sm">Bio</span>
                  </div>
                  <textarea 
                    className="w-full bg-gray-50 rounded-2xl p-4 text-sm font-medium text-gray-700 border border-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none transition-all"
                    rows="3"
                    placeholder="Tell the community about yourself..."
                    value={profile.description}
                    onChange={e => setProfile({...profile, description: e.target.value})}
                  />
               </div>

               {/* Birthdate */}
               <div className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center">
                     <div className="bg-gray-50 p-2 rounded-xl mr-3">
                       <Calendar className="w-5 h-5 text-gray-600" />
                     </div>
                     <span className="font-bold text-gray-900 text-sm">Birthdate</span>
                  </div>
                  <input 
                    type="date" 
                    className="text-sm text-gray-500 font-bold bg-transparent border-none focus:ring-0 cursor-pointer outline-none text-right"
                    value={profile.birthdate}
                    onChange={e => setProfile({...profile, birthdate: e.target.value})}
                  />
               </div>

               {/* Gender */}
               <div className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center">
                     <div className="bg-gray-50 p-2 rounded-xl mr-3">
                       <Users className="w-5 h-5 text-gray-600" />
                     </div>
                     <span className="font-bold text-gray-900 text-sm">Gender</span>
                  </div>
                  <div className="relative flex items-center">
                    <select 
                      className="text-sm text-gray-500 font-bold bg-transparent border-none focus:ring-0 cursor-pointer outline-none appearance-none pr-6 text-right"
                      value={profile.gender}
                      onChange={e => setProfile({...profile, gender: e.target.value})}
                    >
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer_not_to_say">Prefer not to say</option>
                    </select>
                    <ChevronRight className="w-4 h-4 text-gray-400 absolute right-0 pointer-events-none" />
                  </div>
               </div>
             </div>
           </div>
        )}

        {/* Account / Admin Section */}
        {Boolean(user?.is_admin) && (
           <div>
             <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-2">Account</h3>
             <div className="bg-white rounded-3xl shadow-sm border border-gray-100 divide-y divide-gray-100 overflow-hidden">
                <Link to="/admin" className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                   <div className="flex items-center">
                      <div className="bg-indigo-50 p-2 rounded-xl mr-3">
                        <ShieldCheck className="w-5 h-5 text-indigo-600" />
                      </div>
                      <span className="font-bold text-gray-900 text-sm">Admin Panel</span>
                   </div>
                   <ChevronRight className="w-4 h-4 text-gray-400" />
                </Link>
             </div>
           </div>
        )}

        {/* Actions */}
        <div className="pt-4 flex flex-col sm:flex-row gap-3 sm:gap-4 pb-8">
          <button 
            type="button" 
            onClick={handleLogout} 
            className="w-full sm:w-1/3 bg-white hover:bg-red-50 text-red-600 hover:border-red-200 font-bold py-3.5 rounded-2xl shadow-sm border border-gray-200 transition-all flex justify-center items-center order-2 sm:order-1"
          >
             <LogOut className="w-4 h-4 mr-2" /> Log Out
          </button>
          
          <button 
            type="submit" 
            disabled={saving || !hasFormChanged()}
            className="w-full sm:w-2/3 bg-primary-600 hover:bg-primary-700 text-white font-bold py-3.5 rounded-2xl shadow-sm transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed order-1 sm:order-2"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
        </div>

      </form>
    </div>
  );
}
