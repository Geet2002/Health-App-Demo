import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Trash2, Shield, User as UserIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export default function AdminUsersTab() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/users`);
      setUsers(res.data);
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user? All their data will be lost.')) return;
    try {
      await axios.delete(`${API_URL}/admin/users/${id}`);
      toast.success('User deleted');
      setUsers(users.filter(u => u.id !== id));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete user');
    }
  };

  const handlePromote = async (id) => {
    if (!window.confirm('Promote this user to admin?')) return;
    try {
      await axios.put(`${API_URL}/admin/users/${id}/promote`);
      toast.success('User promoted to admin');
      setUsers(users.map(u => u.id === id ? { ...u, is_admin: 1 } : u));
    } catch (err) {
      toast.error('Failed to promote user');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading users...</div>;

  return (
    <div>
      <div className="mb-6 flex justify-between items-end">
        <h2 className="text-2xl font-bold text-gray-800">User Management</h2>
        <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full font-medium">
          {users.length} Users Total
        </span>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-sm font-semibold text-gray-600">
                <th className="p-4">User</th>
                <th className="p-4 hidden sm:table-cell">Joined Date</th>
                <th className="p-4">Role</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden border border-gray-200 flex-shrink-0">
                        {u.profile_picture ? (
                          <img src={`${API_URL.replace('/api', '')}${u.profile_picture}`} alt={u.username} className="w-full h-full object-cover" />
                        ) : (
                          <UserIcon className="w-5 h-5 text-primary-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 flex items-center space-x-2">
                          <span>{u.username}</span>
                          {u.is_medical_professional === 1 && (
                            <span className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.5 rounded-full uppercase tracking-wide font-bold">Med</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">{u.email || 'No email'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-gray-600 hidden sm:table-cell">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-4">
                    {u.is_admin ? (
                      <span className="inline-flex items-center space-x-1 text-xs font-medium px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                        <Shield className="w-3 h-3" />
                        <span>Admin</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                        User
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!u.is_admin && (
                        <button 
                          onClick={() => handlePromote(u.id)}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors border border-transparent hover:border-purple-200"
                          title="Promote to Admin"
                        >
                          <Shield className="w-4 h-4" />
                        </button>
                      )}
                      {u.id !== currentUser.id && (
                        <button 
                          onClick={() => handleDelete(u.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-gray-500">No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
