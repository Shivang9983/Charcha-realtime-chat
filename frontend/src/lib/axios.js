import axios from 'axios';

export const axiosInstance = axios.create({
  baseURL: import.meta.env.MODE === 'development' ? 'http://localhost:5001/api' : '/api',
  withCredentials: true, // Essential for sending HTTP-only cookies in MERN Stack requests
});
