import { io } from 'socket.io-client';

const URL = import.meta.env.VITE_API_URL 
  ? import.meta.env.VITE_API_URL.replace('/api', '')
  : 'http://localhost:5001';

export const socket = io(URL, {
  autoConnect: true,
  withCredentials: true,
});
