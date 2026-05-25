import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Toaster, ToastBar, toast } from 'react-hot-toast';
import { X, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ConfirmProvider } from './context/ConfirmContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import Sidebar from './components/Sidebar';
import Feed from './pages/Feed';
import Landing from './pages/Landing';
import CreatePost from './pages/CreatePost';
import PostDetail from './pages/PostDetail';
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
import AdminPanel from './pages/AdminPanel';

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
              <Route path="/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />
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
          position="top-right" 
          toastOptions={{
            duration: 4000,
          }} 
        >
          {(t) => (
            <ToastBar 
              toast={t} 
              style={{
                padding: 0,
                background: 'transparent',
                boxShadow: 'none',
                maxWidth: '420px',
                width: '100%',
                border: 'none',
              }}
            >
              {({ icon, message }) => {
                const isSuccess = t.type === 'success';
                const isError = t.type === 'error';
                const bgClass = isSuccess ? 'bg-emerald-50' : isError ? 'bg-red-50' : 'bg-blue-50';
                const iconColorClass = isSuccess ? 'text-emerald-500' : isError ? 'text-red-500' : 'text-blue-500';

                // Extract title and subtitle if passed as a string with a colon or newline
                // Otherwise use default titles
                let title = isSuccess ? 'Success' : isError ? 'Error' : 'Notification';
                
                return (
                  <div className="flex w-full bg-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.12)] rounded-[20px] p-4 border border-gray-100 items-start relative overflow-hidden ring-1 ring-black/5">
                    <div className="flex-shrink-0">
                      <div className={`w-12 h-12 rounded-[14px] flex items-center justify-center ${bgClass}`}>
                        {isSuccess ? (
                          <CheckCircle2 className={`w-6 h-6 ${iconColorClass}`} />
                        ) : isError ? (
                          <XCircle className={`w-6 h-6 ${iconColorClass}`} />
                        ) : (
                          <AlertCircle className={`w-6 h-6 ${iconColorClass}`} />
                        )}
                      </div>
                    </div>
                    
                    <div className="ml-4 flex-1 min-w-0 pr-6 min-h-[48px] flex flex-col justify-center">
                      <p className="text-[15px] font-bold text-gray-900 truncate">
                        {title}
                      </p>
                      <div className="mt-1 text-[14px] text-gray-500 font-medium leading-relaxed">
                        {message}
                      </div>
                    </div>
                    
                    {t.type !== 'loading' && (
                      <button 
                        onClick={() => toast.dismiss(t.id)} 
                        className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100/50 rounded-full transition-colors focus:outline-none shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              }}
            </ToastBar>
          )}
        </Toaster>
        <ConfirmProvider>
          <AppContent />
        </ConfirmProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
