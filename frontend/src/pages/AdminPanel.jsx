import React, { useState } from 'react';
import { LayoutDashboard, Users, FileText, Share2, Shield } from 'lucide-react';
import AdminDashboardTab from '../components/admin/AdminDashboardTab';
import AdminUsersTab from '../components/admin/AdminUsersTab';
import AdminPostsTab from '../components/admin/AdminPostsTab';
import AdminCommunitiesTab from '../components/admin/AdminCommunitiesTab';
import AdminVerificationsTab from '../components/admin/AdminVerificationsTab';
import AdminBloodRequestsTab from '../components/admin/AdminBloodRequestsTab';
import AdminMomentsTab from '../components/admin/AdminMomentsTab';
import { ShieldAlert, Droplets, Activity } from 'lucide-react';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'posts', label: 'Posts', icon: FileText },
    { id: 'communities', label: 'Communities', icon: Share2 },
    { id: 'verifications', label: 'Verifications', icon: ShieldAlert },
    { id: 'blood-requests', label: 'Blood Requests', icon: Droplets },
    { id: 'moments', label: 'Moments', icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-gray-50/50 rounded-3xl pb-12">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm rounded-t-3xl">
        <div className="px-6 sm:px-8 py-6">
          <div className="flex items-center space-x-3">
            <div className="bg-purple-100 p-2.5 rounded-xl shadow-inner border border-purple-200/50">
              <Shield className="w-7 h-7 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Admin Console</h1>
              <p className="text-sm text-gray-500 font-medium mt-0.5">Manage and monitor your CareCommunity platform.</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 sm:px-8 overflow-x-auto no-scrollbar">
          <nav className="flex space-x-8 min-w-max" aria-label="Tabs">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-all duration-200
                    ${isActive 
                      ? 'border-purple-500 text-purple-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-purple-500' : 'text-gray-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6 sm:p-8">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'dashboard' && <AdminDashboardTab setActiveTab={setActiveTab} />}
          {activeTab === 'users' && <AdminUsersTab />}
          {activeTab === 'posts' && <AdminPostsTab />}
          {activeTab === 'communities' && <AdminCommunitiesTab />}
          {activeTab === 'verifications' && <AdminVerificationsTab />}
          {activeTab === 'blood-requests' && <AdminBloodRequestsTab />}
          {activeTab === 'moments' && <AdminMomentsTab />}
        </div>
      </div>
    </div>
  );
}
