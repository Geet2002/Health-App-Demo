import { io } from 'socket.io-client';

const getSocketUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl) return 'http://localhost:5001';
  
  let url = envUrl.replace('/api', '');
  if (url.includes('localhost') && typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    url = url.replace('localhost', window.location.hostname);
  }
  return url;
};

export const socket = io(getSocketUrl(), {
  autoConnect: true,
  auth: (cb) => {
    cb({ token: localStorage.getItem('token') });
  }
});
