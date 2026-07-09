import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from './stores/useAuthStore';
import { useChatStore } from './stores/useChatStore';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ProfilePage from './pages/ProfilePage';
import ToastContainer from './components/Toast';

export default function App() {
  const { authUser, checkAuth, isCheckingAuth, socket } = useAuthStore();
  const { subscribeToMessages, unsubscribeFromMessages } = useChatStore();
  const [showSplash, setShowSplash] = useState(true);
  const [loadingText, setLoadingText] = useState('Syncing chat environment...');
  const [progress, setProgress] = useState(0);

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
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Sync loading sequence text and progress bar
  useEffect(() => {
    const textSequence = [
      'Authenticating session...',
      'Connecting to secure server...',
      'Syncing conversations...',
      'Readying workspace...'
    ];
    let currentIndex = 0;

    const textInterval = setInterval(() => {
      if (currentIndex < textSequence.length - 1) {
        currentIndex++;
        setLoadingText(textSequence[currentIndex]);
      }
    }, 400);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 6;
      });
    }, 90);

    const minSplashTimer = setTimeout(() => {
      if (!isCheckingAuth) {
        setShowSplash(false);
      }
    }, 1600);

    return () => {
      clearInterval(textInterval);
      clearInterval(progressInterval);
      clearTimeout(minSplashTimer);
    };
  }, [isCheckingAuth]);

  // Secondary backup check to dismiss splash if checkAuth is slower than 1600ms
  useEffect(() => {
    if (!isCheckingAuth) {
      const dismissDelay = setTimeout(() => {
        setShowSplash(false);
      }, 200);
      return () => clearTimeout(dismissDelay);
    }
  }, [isCheckingAuth]);

  if (showSplash) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 via-neutral-950 to-black text-slate-100 select-none">
        <div className="flex flex-col items-center gap-6 max-w-xs w-full px-4 text-center animate-in fade-in zoom-in-95 duration-500">
          {/* Glowing Animated Logo */}
          <div className="relative flex items-center justify-center h-20 w-20 rounded-3xl bg-gradient-to-tr from-indigo-500 to-purple-600 shadow-[0_0_35px_rgba(99,102,241,0.25)] animate-pulse-glow hover:scale-105 duration-300">
            <svg className="w-11 h-11 text-white" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 9h14c1.1 0 2 .9 2 2v8c0 1.1-.9 2-2 2h-9l-4 4v-4H9c-1.1 0-2-.9-2-2v-8c0-1.1.9-2 2-2zm2 3v1.5h10V12H11zm0 3.5V17h7v-1.5h-7z" fill="currentColor" />
            </svg>
          </div>

          <div className="space-y-1 mt-2">
            <h1 className="text-3xl font-black tracking-wider bg-gradient-to-r from-white via-indigo-200 to-purple-300 bg-clip-text text-transparent">
              CHARCHA
            </h1>
            <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase opacity-75">
              Real-time communication
            </p>
          </div>

          {/* Custom animated progress line */}
          <div className="w-full h-1 bg-slate-800/80 rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-150 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="text-xs font-semibold text-indigo-300/80 tracking-wide min-h-[16px] animate-pulse">
            {loadingText}
          </p>
        </div>
      </div>
    );
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
    </div>
  );
}

