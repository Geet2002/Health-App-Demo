import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Toaster } from 'react-hot-toast';
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
          <div className="max-w-4xl mx-auto">
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
              background: '#333',
              color: '#fff',
              fontWeight: '500',
              borderRadius: '12px',
              padding: '16px',
            },
            success: {
              style: {
                background: '#10b981',
                color: '#fff',
              },
            },
            error: {
              style: {
                background: '#ef4444',
                color: '#fff',
              },
            },
          }} 
        />
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
