import axios from 'axios';

const BACKEND_URL = import.meta.env.MODE === 'development'
  ? 'http://localhost:5001'
  : 'https://charcha-realtime-chat.onrender.com';
console.log("Backend URL loaded:", BACKEND_URL);

export const axiosInstance = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  withCredentials: true, // Essential for sending HTTP-only cookies in MERN Stack requests
});
