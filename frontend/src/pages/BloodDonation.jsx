import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { Droplet, MapPin, Clock, PlusCircle, CheckCircle, User } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export default function BloodDonation() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchRequests = async () => {
    try {
      const response = await axios.get(`${API_URL}/blood-requests`);
      setRequests(response.data);
    } catch (error) {
      console.error('Error fetching blood requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);



  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center">
            <Droplet className="w-6 h-6 mr-2 text-red-600" />
            Blood Requests
          </h1>
          <p className="text-gray-500 text-sm mt-1">Help save a life by donating blood to those in need.</p>
        </div>
        <Link to="/blood-donation/create" className="btn-primary flex items-center space-x-2 bg-red-600 hover:bg-red-700 focus:ring-red-500">
          <PlusCircle className="w-4 h-4" />
          <span className="hidden sm:inline">Request Blood</span>
          <span className="sm:hidden">Request</span>
        </Link>
      </div>

      {requests.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl shadow-sm border border-gray-100 text-center">
          <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Droplet className="w-8 h-8 text-red-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No active blood requests</h3>
          <p className="text-gray-500">There are currently no blood requests in the system.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
          {requests.map(request => (
            <div key={request.id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden flex flex-col ${request.status === 'fulfilled' ? 'opacity-60 border-gray-200' : 'border-red-100'}`}>
              <div className={`px-5 py-4 border-b ${request.status === 'fulfilled' ? 'bg-gray-50 border-gray-200' : 'bg-red-50/50 border-red-50'} flex justify-between items-start`}>
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{request.patient_name}</h3>
                  <p className="text-xs text-gray-500 mt-1 flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    Requested {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex flex-col items-end space-y-2">
                  <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-lg font-black bg-red-100 text-red-700 border border-red-200">
                    {request.blood_group}
                  </span>
                  {request.status !== 'fulfilled' && (
                    <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border ${getUrgencyColor(request.urgency)}`}>
                      {request.urgency}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="p-5 flex-grow">
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-start">
                    <Droplet className="w-4 h-4 mr-2 mt-0.5 text-gray-400 flex-shrink-0" />
                    <span><strong>{request.units_required}</strong> Units Required</span>
                  </div>
                  <div className="flex items-start">
                    <MapPin className="w-4 h-4 mr-2 mt-0.5 text-gray-400 flex-shrink-0" />
                    <span className="line-clamp-2">{request.location}</span>
                  </div>
                  <div className="flex items-start">
                    <User className="w-4 h-4 mr-2 mt-0.5 text-gray-400 flex-shrink-0" />
                    <span>Requested by {request.requester_name}</span>
                  </div>
                </div>
              </div>

              <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                {request.status === 'fulfilled' ? (
                  <span className="inline-flex items-center text-sm font-semibold text-green-600">
                    <CheckCircle className="w-4 h-4 mr-1.5" /> Fulfilled
                  </span>
                ) : (
                  <span className="inline-flex items-center text-sm font-semibold text-yellow-600">
                    <Clock className="w-4 h-4 mr-1.5" /> Pending
                  </span>
                )}
                <Link to={`${user ? `/blood-donation/${request.id}` : '/login'}`} className={`text-sm font-bold bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors w-full sm:w-auto text-center ${!user ? 'cursor-not-allowed opacity-50' : ''}`}>
                  {user ? (user.id === request.user_id ? 'Manage Request' : 'View Details') : 'View Details'}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
