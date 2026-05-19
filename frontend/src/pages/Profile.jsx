import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Camera, User as UserIcon, Calendar, Info, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState({
    birthdate: '',
    description: '',
    gender: '',
    profile_picture: null
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${API_URL}/users/profile`);
      const data = res.data;
      setProfile({
        birthdate: data.birthdate ? new Date(data.birthdate).toISOString().split('T')[0] : '',
        description: data.description || '',
        gender: data.gender || '',
        profile_picture: data.profile_picture || null
      });
      if (data.profile_picture) {
        setImagePreview(`${API_URL.replace('/api', '')}${data.profile_picture}`);
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
      // Force reload to update sidebar avatar (or we could use context, but reload is robust)
      window.location.reload();
    } catch (err) {
      setMessage('Failed to update profile.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-12">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Your Profile</h1>
        <p className="text-gray-500 mt-2 text-lg">Manage your personal information and identity.</p>
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
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleImageChange} 
            />
          </div>

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

          <div className="mt-10 flex justify-end">
            <button 
              type="submit" 
              disabled={saving}
              className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-colors disabled:opacity-50 flex items-center"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
