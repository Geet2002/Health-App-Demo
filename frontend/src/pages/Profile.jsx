import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Camera, User as UserIcon, Calendar, Info, Users, ShieldCheck, BadgeCheck, ShieldMinus, Clock, LogOut, ChevronRight } from 'lucide-react';
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
  const [message, setMessage] = useState('');
  
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
    setMessage('');
    
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
      setMessage('Profile updated successfully!');
      
      // Update global auth state and local profile state without reloading the page
      await checkUser();
      await fetchProfile();
      
      // Reset imageFile so the save button correctly disables if no other changes were made
      setImageFile(null);
    } catch (err) {
      setMessage('Failed to update profile.');
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

  if (loading) return <ProfileSkeleton />;

  return (
    <div className="max-w-md mx-auto space-y-4 sm:space-y-6 animate-fade-in pb-32 px-4 pt-0 sm:pt-6 min-h-screen">
      <div className="flex justify-start items-center mb-4 sm:mb-8 mt-0 sm:mt-2 ml-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Profile</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
        
        {message && (
          <div className={`p-4 rounded-xl text-sm font-medium ${message.includes('success') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {message}
          </div>
        )}

        {/* Top Profile Card */}
        <div 
          className="bg-white rounded-3xl p-5 flex items-center shadow-sm border border-gray-100 relative cursor-pointer group hover:shadow-md transition-all"
          onClick={() => fileInputRef.current.click()}
        >
          <div className="relative shrink-0">
             <div className="w-16 h-16 rounded-full overflow-hidden bg-primary-50 ring-2 ring-gray-100 group-hover:ring-primary-500 transition-all flex items-center justify-center">
               {imagePreview ? (
                 <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" />
               ) : (
                 <span className="text-2xl font-bold text-primary-500">{user?.username?.[0]?.toUpperCase()}</span>
               )}
             </div>
             <div className="absolute bottom-0 right-0 bg-primary-600 p-1 rounded-full text-white shadow-sm border-2 border-white">
               <Camera className="w-3 h-3" />
             </div>
          </div>
          <div className="ml-4 overflow-hidden">
            <h2 className="text-lg font-bold text-gray-900 truncate">{user?.username}</h2>
            <p className="text-sm text-gray-500 truncate">{user?.email}</p>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleImageChange} 
          />
        </div>

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
        <div className="pt-2 space-y-3 pb-8">
          <button 
            type="submit" 
            disabled={saving || (initialProfile && JSON.stringify(profile) === JSON.stringify(initialProfile) && !imageFile)}
            className="w-full bg-gray-900 hover:bg-black text-white font-bold py-3.5 rounded-2xl shadow-sm transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          
          <button 
            type="button" 
            onClick={handleLogout} 
            className="w-full bg-white hover:bg-gray-50 text-red-600 font-bold py-3.5 rounded-2xl shadow-sm border border-gray-200 transition-colors flex justify-center items-center"
          >
             <LogOut className="w-4 h-4 mr-2" /> Log Out
          </button>
        </div>

      </form>
    </div>
  );
}
