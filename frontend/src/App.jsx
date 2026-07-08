import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from './stores/useAuthStore';
import { useChatStore } from './stores/useChatStore';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ProfilePage from './pages/ProfilePage';
import { Loader2 } from 'lucide-react';

export default function App() {
  const { authUser, checkAuth, isCheckingAuth, socket } = useAuthStore();
  const { subscribeToMessages, unsubscribeFromMessages } = useChatStore();

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

  if (isCheckingAuth && !authUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
          <h1 className="text-xl font-medium tracking-wide">Syncing chat environment...</h1>
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
    </div>
  );
}
