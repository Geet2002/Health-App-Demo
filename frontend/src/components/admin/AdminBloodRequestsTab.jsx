import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Droplet, Trash2, MapPin, User, Clock, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { useConfirm } from '../../context/ConfirmContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export default function AdminBloodRequestsTab() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const confirm = useConfirm();

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/admin/blood-requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequests(res.data);
    } catch (err) {
      toast.error('Failed to load blood requests');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Delete Blood Request',
      message: 'Are you sure you want to delete this blood request? This action is permanent.',
      confirmText: 'Delete',
      confirmColor: 'bg-red-600 hover:bg-red-700 text-white',
      type: 'danger'
    });
    if (!ok) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/admin/blood-requests/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequests(requests.filter(req => req.id !== id));
      toast.success('Blood request deleted');
    } catch (err) {
      toast.error('Failed to delete request');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading blood requests...</div>;

  const filteredRequests = requests.filter(req => 
    (req.patient_name && req.patient_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (req.blood_group && req.blood_group.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (req.location && req.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (req.requester_name && req.requester_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <Droplet className="w-6 h-6 mr-2 text-red-500" />
          Blood Requests
        </h2>
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:min-w-[280px]">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Search by name, blood type, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-sm"
            />
          </div>
          <span className="text-sm text-gray-500 bg-gray-100 px-3 py-2 rounded-xl font-medium whitespace-nowrap hidden sm:block">
            {filteredRequests.length} Requests
          </span>
        </div>
      </div>

      {filteredRequests.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
          <p className="text-gray-500">No blood requests found.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredRequests.map(req => (
            <div key={req.id} className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between shadow-sm">
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-black rounded-lg">
                    {req.blood_group}
                  </span>
                  <h4 className="font-bold text-gray-900 truncate text-lg">{req.patient_name}</h4>
                  {req.status === 'fulfilled' && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded uppercase tracking-wider">Fulfilled</span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                  <span className="flex items-center"><User className="w-3.5 h-3.5 mr-1" /> Requested by {req.requester_name}</span>
                  <span className="flex items-center"><Droplet className="w-3.5 h-3.5 mr-1" /> {req.units_required} Units</span>
                  <span className="flex items-center"><MapPin className="w-3.5 h-3.5 mr-1" /> {req.location}</span>
                  <span className="flex items-center"><Clock className="w-3.5 h-3.5 mr-1" /> {formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}</span>
                </div>
              </div>
              <div className="mt-4 sm:mt-0 flex-shrink-0">
                <button
                  onClick={() => handleDelete(req.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  title="Delete Request"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
