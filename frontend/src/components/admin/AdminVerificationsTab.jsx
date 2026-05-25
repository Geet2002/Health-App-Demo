import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShieldAlert, Check, X, User, ShieldMinus } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export default function AdminVerificationsTab() {
  const [activeSubTab, setActiveSubTab] = useState('pending'); // 'pending' | 'verified'
  const [requests, setRequests] = useState([]);
  const [verifiedUsers, setVerifiedUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeSubTab === 'pending') {
      fetchRequests();
    } else {
      fetchVerifiedUsers();
    }
  }, [activeSubTab]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/admin/medical-requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequests(res.data);
    } catch (err) {
      toast.error('Failed to load verification requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchVerifiedUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/admin/medical-verified-users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVerifiedUsers(res.data);
    } catch (err) {
      toast.error('Failed to load verified users');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/admin/users/${id}/approve-medical`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequests(requests.filter(r => r.id !== id));
      toast.success('Medical professional approved');
    } catch (err) {
      toast.error('Failed to approve request');
    }
  };

  const handleReject = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/admin/users/${id}/reject-medical`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequests(requests.filter(r => r.id !== id));
      toast.success('Medical professional rejected');
    } catch (err) {
      toast.error('Failed to reject request');
    }
  };

  const handleRevoke = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/admin/users/${id}/unverify-medical`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVerifiedUsers(verifiedUsers.filter(r => r.id !== id));
      toast.success('Medical verification revoked');
    } catch (err) {
      toast.error('Failed to revoke verification');
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <ShieldAlert className="w-6 h-6 mr-2 text-primary-600" />
          Medical Verifications
        </h2>
        <div className="flex bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveSubTab('pending')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeSubTab === 'pending' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Pending ({activeSubTab === 'pending' && !loading ? requests.length : '...'})
          </button>
          <button
            onClick={() => setActiveSubTab('verified')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeSubTab === 'verified' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Verified Users ({activeSubTab === 'verified' && !loading ? verifiedUsers.length : '...'})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-500">Loading data...</div>
      ) : activeSubTab === 'pending' ? (
        requests.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
            <ShieldAlert className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-800">All caught up!</h3>
            <p className="text-gray-500">No pending medical verification requests right now.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {requests.map(req => (
              <div key={req.id} className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center justify-between shadow-sm">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden shrink-0">
                    {req.profile_picture ? (
                      <img src={`${API_URL.replace('/api', '')}${req.profile_picture}`} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-primary-600" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{req.username}</h4>
                    <p className="text-xs text-gray-500">{req.email || 'No email provided'}</p>
                    <p className="text-[10px] text-gray-400 mt-1 uppercase font-semibold">
                      Requested {formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleReject(req.id)}
                    className="px-4 py-2 bg-red-50 text-red-600 font-bold text-sm rounded-xl hover:bg-red-100 flex items-center transition-colors"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Reject
                  </button>
                  <button
                    onClick={() => handleApprove(req.id)}
                    className="px-4 py-2 bg-green-500 text-white font-bold text-sm rounded-xl hover:bg-green-600 flex items-center shadow-sm transition-colors"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        verifiedUsers.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
            <h3 className="text-lg font-bold text-gray-800">No verified users yet.</h3>
          </div>
        ) : (
          <div className="grid gap-4">
            {verifiedUsers.map(user => (
              <div key={user.id} className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center justify-between shadow-sm">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full bg-green-50 border border-green-100 flex items-center justify-center overflow-hidden shrink-0">
                    {user.profile_picture ? (
                      <img src={`${API_URL.replace('/api', '')}${user.profile_picture}`} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-green-600" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{user.username}</h4>
                    <p className="text-xs text-gray-500">{user.email || 'No email provided'}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded uppercase tracking-wider">
                      Verified
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleRevoke(user.id)}
                  className="px-4 py-2 bg-red-50 text-red-600 font-bold text-sm rounded-xl hover:bg-red-100 flex items-center transition-colors"
                >
                  <ShieldMinus className="w-4 h-4 mr-1" />
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
