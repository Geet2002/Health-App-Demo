import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Camera, User as UserIcon, Calendar, Info, Users, ShieldCheck, BadgeCheck, ShieldMinus, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export default function Profile() {
  const navigate = useNavigate();
  const { user, checkUser } = useAuth();
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

  if (loading) return <div className="text-center py-12">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          {user?.is_admin ? 'Admin Profile' : 'Your Profile'}
        </h1>
        <p className="text-gray-500 mt-2 text-lg">
          {user?.is_admin ? 'Manage your administrator account.' : 'Manage your personal information and identity.'}
        </p>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-8">
          
          {message && (
            <div className={`p-4 rounded-xl mb-6 text-sm font-medium ${message.includes('success') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {message}
            </div>
          )}

          {/* Profile Picture */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current.click()}>
              <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-primary-100 flex items-center justify-center relative">
                {imagePreview ? (
                  <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-5xl font-bold text-primary-500">{user?.username?.[0]?.toUpperCase()}</span>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="w-8 h-8 text-white" />
                </div>
              </div>
              <div className="mt-3 text-sm font-medium text-primary-600 hover:text-primary-700 text-center">
                Change Picture
              </div>
            </div>
            
            {profile.medical_verification_status === 'approved' && (
              <div className="mt-4 flex items-center px-3 py-1 bg-blue-50 border border-blue-100 rounded-full">
                <BadgeCheck className="w-4 h-4 text-blue-500 mr-1.5" />
                <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Verified Professional</span>
              </div>
            )}
            
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleImageChange} 
            />
          </div>

          {/* Medical Badge Verification (Regular Users Only) */}
          {!user?.is_admin && (
            <div className="bg-blue-50 rounded-2xl p-6 mb-8 border border-blue-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center">
                <div className="bg-blue-100 p-3 rounded-xl mr-4">
                  <ShieldCheck className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">Medical Professional</h3>
                  <p className="text-gray-600 text-sm">Verify your identity to get a badge next to your name.</p>
                  {profile.medical_verification_status === 'rejected' && (
                    <p className="text-red-600 text-xs font-bold mt-1">Your previous request was rejected.</p>
                  )}
                </div>
              </div>
              
              {profile.medical_verification_status === 'approved' ? (
                <div className="flex flex-col sm:flex-row items-center gap-3">
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
                    className="px-4 py-2 bg-white text-gray-500 font-semibold rounded-full border border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 shadow-sm transition-all text-sm flex items-center"
                  >
                    <ShieldMinus className="w-4 h-4 mr-1.5" />
                    Remove Verification
                  </button>
                </div>
              ) : profile.medical_verification_status === 'pending' ? (
                showCancelPrompt ? (
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleCancelRequest}
                      className="px-3 py-1.5 text-sm rounded-full font-semibold transition-colors bg-red-500 text-white hover:bg-red-600 whitespace-nowrap"
                    >
                      Cancel Verification
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCancelPrompt(false)}
                      className="px-3 py-1.5 text-sm rounded-full font-semibold transition-colors bg-gray-200 text-gray-700 hover:bg-gray-300"
                    >
                      Back
                    </button>
                  </div>
                ) : (
                  <button 
                    type="button"
                    onClick={() => setShowCancelPrompt(true)}
                    className="px-3 py-1.5 rounded-full font-bold bg-yellow-100 text-yellow-700 border border-yellow-200 flex items-center text-sm hover:bg-yellow-200 transition-colors cursor-pointer"
                  >
                    <Clock className="w-4 h-4 mr-1.5" />
                    Pending
                  </button>
                )
              ) : (
              <button
                type="button"
                onClick={handleToggleMedical}
                className="px-4 py-1.5 text-sm rounded-full font-semibold transition-colors bg-blue-500 text-white hover:bg-blue-600 whitespace-nowrap"
              >
                Request Verification
              </button>
              )}
            </div>
          )}

          {/* Regular User Details */}
          {!user?.is_admin && (
            <div className="space-y-6">
              {/* Bio */}
              <div>
                <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                  <Info className="w-4 h-4 mr-2 text-primary-500" />
                  Bio / Description
                </label>
                <textarea 
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  rows="4"
                  placeholder="Tell the community about yourself..."
                  value={profile.description}
                  onChange={e => setProfile({...profile, description: e.target.value})}
                ></textarea>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                {/* Birthdate */}
                <div>
                  <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 mr-2 text-primary-500" />
                    Birthdate
                  </label>
                  <input 
                    type="date" 
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    value={profile.birthdate}
                    onChange={e => setProfile({...profile, birthdate: e.target.value})}
                  />
                </div>

                {/* Gender */}
                <div>
                  <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                    <Users className="w-4 h-4 mr-2 text-primary-500" />
                    Gender
                  </label>
                  <select 
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-white"
                    value={profile.gender}
                    onChange={e => setProfile({...profile, gender: e.target.value})}
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Admin Specific Dashboard Link */}
          {user?.is_admin && (
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-6 sm:p-8 mb-8 border border-indigo-100 flex flex-col items-center text-center">
              <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                <ShieldCheck className="w-8 h-8 text-indigo-600" />
              </div>
              <h3 className="font-black text-gray-900 text-xl sm:text-2xl mb-2">Administrator Account</h3>
              <p className="text-gray-600 max-w-md mb-6">
                You have elevated privileges. Use the Admin Panel to manage users, communities, posts, and medical verifications.
              </p>
              <Link 
                to="/admin" 
                className="inline-flex items-center justify-center px-6 py-3 bg-indigo-600 text-white font-bold rounded-full hover:bg-indigo-700 transition-colors shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                Go to Admin Panel
              </Link>
            </div>
          )}

          <div className="mt-10 flex justify-end">
            <button 
              type="submit" 
              disabled={saving || (initialProfile && JSON.stringify(profile) === JSON.stringify(initialProfile) && !imageFile)}
              className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
