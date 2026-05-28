import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Toaster, ToastBar, toast } from 'react-hot-toast';
import { X, CheckCircle2, XCircle, AlertCircle, ArrowUp } from 'lucide-react';
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

  const mainRef = useRef(null);
  const [showBackToTop, setShowBackToTop] = useState(false);

  const handleScroll = () => {
    if (mainRef.current) {
      // Show back to top button when scrolled down 300px
      setShowBackToTop(mainRef.current.scrollTop > 300);
    }
  };

  const scrollToTop = () => {
    if (mainRef.current) {
      mainRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="flex flex-col sm:flex-row h-screen bg-gray-50 overflow-hidden relative">
      {!hideSidebar && <Sidebar />}
      <main 
        ref={mainRef}
        onScroll={handleScroll}
        className={`flex-1 overflow-y-auto w-full relative ${!hideSidebar ? 'px-4 sm:px-6 lg:px-8 py-8 pb-24 sm:pb-8' : ''}`}
      >
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
              <Route path="/blood-donation/:id" element={<ProtectedRoute><BloodRequestDetails /></ProtectedRoute>} />
              <Route path="/health-moments" element={<ProtectedRoute><HealthMoments /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/user/:id" element={<ProtectedRoute><UserPublicProfile /></ProtectedRoute>} />
              
              <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
              <Route path="/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />
            </Routes>
          </div>
        )}
        
        {/* Back To Top Button */}
        {!isFullPage && (
          <button
            onClick={scrollToTop}
            className={`fixed bottom-24 sm:bottom-10 left-1/2 -translate-x-1/2 p-2 rounded-full bg-white/40 backdrop-blur-md border border-white/50 text-primary-700 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:bg-white/60 hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-all duration-300 z-[60] flex items-center justify-center ${showBackToTop ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}
            aria-label="Back to top"
          >
            <ArrowUp className="w-5 h-5" />
          </button>
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
          containerClassName="mobile-toast-container"
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
                  <div className="flex w-auto max-w-[90vw] sm:max-w-sm sm:w-full bg-white shadow-lg sm:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.12)] rounded-xl sm:rounded-[20px] p-2 sm:p-4 border border-gray-100 items-center relative overflow-hidden ring-1 ring-black/5 ml-auto mr-2 sm:mx-0">
                    <div className="flex-shrink-0">
                      <div className={`w-7 h-7 sm:w-12 sm:h-12 rounded-lg sm:rounded-[14px] flex items-center justify-center ${bgClass}`}>
                        {isSuccess ? (
                          <CheckCircle2 className={`w-4 h-4 sm:w-6 sm:h-6 ${iconColorClass}`} />
                        ) : isError ? (
                          <XCircle className={`w-4 h-4 sm:w-6 sm:h-6 ${iconColorClass}`} />
                        ) : (
                          <AlertCircle className={`w-4 h-4 sm:w-6 sm:h-6 ${iconColorClass}`} />
                        )}
                      </div>
                    </div>
                    
                    <div className="ml-2.5 sm:ml-4 flex-1 min-w-0 pr-6 sm:min-h-[48px] flex flex-col justify-center text-left">
                      <p className="text-xs sm:text-[15px] font-bold text-gray-900 truncate">
                        {title}
                      </p>
                      <div className="mt-0.5 sm:mt-1 text-[11px] sm:text-[14px] text-gray-500 font-medium leading-tight sm:leading-relaxed truncate sm:whitespace-normal">
                        {message}
                      </div>
                    </div>
                    
                    {t.type !== 'loading' && (
                      <button 
                        onClick={() => toast.dismiss(t.id)} 
                        className="absolute top-1/2 -translate-y-1/2 right-1.5 sm:top-4 sm:-translate-y-0 sm:right-4 p-1 sm:p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100/50 rounded-full transition-colors focus:outline-none shrink-0"
                      >
                        <X className="w-3 h-3 sm:w-4 sm:h-4" />
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
