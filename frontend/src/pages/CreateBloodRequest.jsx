import toast from 'react-hot-toast';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Droplet, MapPin, User, AlertCircle, Hash, Send, ArrowLeft } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export default function CreateBloodRequest() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    patient_name: '',
    blood_group: 'A+',
    units_required: 1,
    location: '',
    urgency: 'high'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API_URL}/blood-requests`, formData);
      navigate('/blood-donation');
    } catch (error) {
      console.error('Error creating blood request:', error);
      toast.error('Failed to post blood request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <button 
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Back
      </button>

      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-red-100 relative">
        <div className="h-2 w-full bg-gradient-to-r from-red-500 to-orange-500"></div>
        
        <div className="p-8">
          <div className="flex items-center mb-8">
            <div className="bg-red-100 p-3 rounded-full mr-4">
              <Droplet className="w-8 h-8 text-red-600" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900">Request Blood</h1>
              <p className="text-gray-500 text-sm mt-1">Submit an urgent request for blood donation.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="sm:col-span-2">
                <label htmlFor="patient_name" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <User className="w-4 h-4 mr-1 text-gray-400" /> Patient Name
                </label>
                <input
                  id="patient_name"
                  name="patient_name"
                  required
                  type="text"
                  placeholder="Full name of the patient"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:border-transparent focus:ring-red-500 transition-colors bg-gray-50 focus:bg-white"
                  value={formData.patient_name}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="blood_group" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Droplet className="w-4 h-4 mr-1 text-red-500" /> Blood Group
                </label>
                <select
                  id="blood_group"
                  name="blood_group"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:border-transparent focus:ring-red-500 transition-colors bg-gray-50 focus:bg-white appearance-none"
                  value={formData.blood_group}
                  onChange={handleChange}
                >
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="units_required" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Hash className="w-4 h-4 mr-1 text-gray-400" /> Units Required
                </label>
                <input
                  id="units_required"
                  name="units_required"
                  required
                  type="number"
                  min="1"
                  max="50"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:border-transparent focus:ring-red-500 transition-colors bg-gray-50 focus:bg-white"
                  value={formData.units_required}
                  onChange={handleChange}
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <MapPin className="w-4 h-4 mr-1 text-gray-400" /> Exact Location (Hospital Name & Area)
                </label>
                <input
                  id="location"
                  name="location"
                  required
                  type="text"
                  placeholder="e.g. City Hospital, Downtown"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:border-transparent focus:ring-red-500 transition-colors bg-gray-50 focus:bg-white"
                  value={formData.location}
                  onChange={handleChange}
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="urgency" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1 text-orange-500" /> Urgency Level
                </label>
                <select
                  id="urgency"
                  name="urgency"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:border-transparent focus:ring-red-500 transition-colors bg-gray-50 focus:bg-white appearance-none"
                  value={formData.urgency}
                  onChange={handleChange}
                >
                  <option value="low">Low (Next few days)</option>
                  <option value="medium">Medium (Within 24 hours)</option>
                  <option value="high">High (Immediate)</option>
                  <option value="critical">Critical (Life-threatening)</option>
                </select>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-6 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 bg-transparent rounded-lg mr-3 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center px-6 py-2.5 rounded-lg text-sm font-bold shadow-md transition-all bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 focus:ring-offset-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? 'Submitting...' : 'Post Blood Request'}
                {!loading && <Send className="w-4 h-4 ml-2" />}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
