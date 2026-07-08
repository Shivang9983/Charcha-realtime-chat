import { create } from 'zustand';
import { axiosInstance } from '../lib/axios';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.MODE === 'development' ? 'http://localhost:5001' : '/';

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get('/auth/me');
      set({ authUser: res.data });
      get().connectSocket();
    } catch (error) {
      console.log('Error in checkAuth:', error);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post('/auth/signup', data);
      set({ authUser: res.data });
      get().connectSocket();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Signup failed' };
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post('/auth/login', data);
      set({ authUser: res.data });
      get().connectSocket();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Login failed' };
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post('/auth/logout');
      get().disconnectSocket();
      set({ authUser: null });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Logout failed' };
    }
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put('/users/update-profile', data);
      set({ authUser: res.data });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Update failed' };
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  connectSocket: () => {
    const { authUser, socket } = get();
    if (!authUser || socket?.connected) return;

    const newSocket = io(SOCKET_URL, {
      query: {
        userId: authUser._id,
      },
    });

    newSocket.connect();
    set({ socket: newSocket });

    newSocket.on('getOnlineUsers', (users) => {
      set({ onlineUsers: users });
    });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null });
    }
  },
}));
