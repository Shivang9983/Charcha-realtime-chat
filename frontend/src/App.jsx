import { useEffect, useState, useRef } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from './stores/useAuthStore';
import { useChatStore } from './stores/useChatStore';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ProfilePage from './pages/ProfilePage';
import ToastContainer from './components/Toast';
import NotificationContainer from './components/NotificationContainer';
import LoadingScreen from './components/LoadingScreen';


export default function App() {
  const authUser = useAuthStore((state) => state.authUser);
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const isCheckingAuth = useAuthStore((state) => state.isCheckingAuth);
  const socket = useAuthStore((state) => state.socket);

  const subscribeToMessages = useChatStore((state) => state.subscribeToMessages);
  const unsubscribeFromMessages = useChatStore((state) => state.unsubscribeFromMessages);
  const getOnlineUserProfiles = useChatStore((state) => state.getOnlineUserProfiles);
  const onlineUsers = useAuthStore((state) => state.onlineUsers);
  const [showSplash, setShowSplash] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const mountTimeRef = useRef(Date.now());

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (authUser && socket) {
      subscribeToMessages();
      return () => unsubscribeFromMessages();
    }
  }, [authUser, socket, subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
    if (authUser && socket) {
      getOnlineUserProfiles();
    }
  }, [authUser, socket, onlineUsers, getOnlineUserProfiles]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Control premium loading screen lifecycle (GPU accelerated fade-out)
  useEffect(() => {
    let fadeOutTimer;
    let unmountTimer;

    if (!isCheckingAuth) {
      const elapsed = Date.now() - mountTimeRef.current;
      const remaining = Math.max(0, 500 - elapsed);

      fadeOutTimer = setTimeout(() => {
        setIsFadingOut(true);
        unmountTimer = setTimeout(() => {
          setShowSplash(false);
        }, 300); // Matches the 300ms transition duration in LoadingScreen.jsx
      }, remaining);
    }

    return () => {
      clearTimeout(fadeOutTimer);
      clearTimeout(unmountTimer);
    };
  }, [isCheckingAuth]);

  if (showSplash) {
    return <LoadingScreen fadeOut={isFadingOut} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100">
      <Routes>
        <Route path="/" element={authUser ? <HomePage /> : <Navigate to="/login" />} />
        <Route path="/signup" element={!authUser ? <SignupPage /> : <Navigate to="/" />} />
        <Route path="/login" element={!authUser ? <LoginPage /> : <Navigate to="/" />} />
        <Route path="/profile" element={authUser ? <ProfilePage /> : <Navigate to="/login" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <ToastContainer />
      <NotificationContainer />
    </div>
  );
}

