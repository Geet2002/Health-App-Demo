import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Toaster, ToastBar, toast } from 'react-hot-toast';
import { X } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Feed from './pages/Feed';
import Landing from './pages/Landing';
import CreatePost from './pages/CreatePost';
import PostDetail from './pages/PostDetail';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Auth from './pages/Auth';
import Communities from './pages/Communities';
import CreateCommunity from './pages/CreateCommunity';
import CommunityDetail from './pages/CommunityDetail';
import Notifications from './pages/Notifications';
import BloodDonation from './pages/BloodDonation';
import CreateBloodRequest from './pages/CreateBloodRequest';
import BloodRequestDetails from './pages/BloodRequestDetails';
import HealthMoments from './pages/HealthMoments';
import Profile from './pages/Profile';
import UserPublicProfile from './pages/UserPublicProfile';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// Sidebar component moved to components/Sidebar.jsx

function AppContent() {
  const location = useLocation();
  const isFullPage = ['/', '/login', '/signup'].includes(location.pathname);
  const hideSidebar = isFullPage;

  return (
    <div className="flex flex-col sm:flex-row h-screen bg-gray-50 overflow-hidden">
      {!hideSidebar && <Sidebar />}
      <main className={`flex-1 overflow-y-auto w-full ${!hideSidebar ? 'px-4 sm:px-6 lg:px-8 py-8 pb-24 sm:pb-8' : ''}`}>
        {isFullPage ? (
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Auth />} />
            <Route path="/signup" element={<Auth />} />
          </Routes>
        ) : (
          <div className="max-w-6xl mx-auto w-full">
            <Routes>
              <Route path="/feed" element={<ProtectedRoute><Feed /></ProtectedRoute>} />
              <Route path="/create" element={<ProtectedRoute><CreatePost /></ProtectedRoute>} />
              <Route path="/post/:id" element={<ProtectedRoute><PostDetail /></ProtectedRoute>} />
              
              <Route path="/communities" element={<ProtectedRoute><Communities /></ProtectedRoute>} />
              <Route path="/communities/create" element={<ProtectedRoute><CreateCommunity /></ProtectedRoute>} />
              <Route path="/communities/:id" element={<ProtectedRoute><CommunityDetail /></ProtectedRoute>} />
              
              <Route path="/blood-donation" element={<ProtectedRoute><BloodDonation /></ProtectedRoute>} />
              <Route path="/blood-donation/create" element={<ProtectedRoute><CreateBloodRequest /></ProtectedRoute>} />
              <Route path="/blood-donation/:id" element={<ProtectedRoute><BloodRequestDetails /></ProtectedRoute>} />
              <Route path="/health-moments" element={<ProtectedRoute><HealthMoments /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/user/:id" element={<ProtectedRoute><UserPublicProfile /></ProtectedRoute>} />
              
              <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            </Routes>
          </div>
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster 
          position="top-center" 
          toastOptions={{
            duration: 4000,
            style: {
              background: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              color: '#1f2937', // text-gray-800
              fontWeight: '600',
              fontSize: '13px',
              borderRadius: '16px',
              padding: '12px 20px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03), 0 0 0 1px rgba(0, 0, 0, 0.03)',
              border: '1px solid rgba(229, 231, 235, 0.5)',
              display: 'inline-flex',
              alignItems: 'center',
            },
            success: {
              iconTheme: {
                primary: '#10b981', // emerald-500
                secondary: '#ffffff',
              },
              style: {
                borderLeft: '4px solid #10b981',
              }
            },
            error: {
              iconTheme: {
                primary: '#ef4444', // red-500
                secondary: '#ffffff',
              },
              style: {
                borderLeft: '4px solid #ef4444',
              }
            },
          }} 
        >
          {(t) => (
            <ToastBar toast={t}>
              {({ icon, message }) => (
                <>
                  {icon}
                  {message}
                  {t.type !== 'loading' && (
                    <button 
                      onClick={() => toast.dismiss(t.id)} 
                      className="ml-3.5 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100/70 rounded-full transition-colors focus:outline-none shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </>
              )}
            </ToastBar>
          )}
        </Toaster>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
