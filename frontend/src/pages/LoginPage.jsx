import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { useToastStore } from '../stores/useToastStore';
import { User, Lock, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const { login, isLoggingIn } = useAuthStore();
  const { addToast } = useToastStore();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.username || !formData.password) {
      setError('All fields are required');
      addToast('All fields are required', 'error');
      return;
    }

    const res = await login(formData);
    if (res.success) {
      addToast(`Welcome back, ${formData.username}!`, 'success');
      navigate('/');
    } else {
      setError(res.error);
      addToast(res.error || 'Login failed', 'error');
    }
  };

  return (
    <div className={`flex min-h-screen items-center justify-center bg-slate-50 dark:bg-black text-slate-800 dark:text-slate-100 p-4 transition-all duration-500 ease-out ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-slate-200 dark:border-neutral-900 bg-white dark:bg-neutral-950 p-5 sm:p-8 max-h-[92vh] sm:max-h-none overflow-y-auto sm:overflow-visible text-slate-800 dark:text-slate-100 shadow-xl dark:shadow-2xl animate-page-entrance select-none">
        <div className="flex flex-col items-center gap-2">
          {/* Animated pulsing logo container */}
          <div className="relative flex items-center justify-center h-12 w-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 shadow-md animate-pulse-glow hover:scale-105 duration-300">
            <svg className="w-6.5 h-6.5 text-white" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 9h14c1.1 0 2 .9 2 2v8c0 1.1-.9 2-2 2h-9l-4 4v-4H9c-1.1 0-2-.9-2-2v-8c0-1.1.9-2 2-2zm2 3v1.5h10V12H11zm0 3.5V17h7v-1.5h-7z" fill="currentColor" />
            </svg>
          </div>
          <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-800 dark:text-white">
            Welcome Back
          </h1>
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">Sign in and jump back into your chats.</p>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 p-3.5 text-xs font-bold text-rose-500 dark:text-rose-400 animate-in fade-in duration-200">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Username</label>
            <div className="relative">
              <input
                type="text"
                name="username"
                placeholder="johndoe"
                value={formData.username}
                onChange={handleInputChange}
                className="w-full rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950 py-3.5 pl-10 pr-4 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-650 transition-all duration-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/20"
              />
              <User className="absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Password</label>
            <div className="relative">
              <input
                type="password"
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950 py-3.5 pl-10 pr-4 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-650 transition-all duration-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/20"
              />
              <Lock className="absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoggingIn}
            className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-650 py-3.5 text-sm font-bold text-white shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50"
          >
            {isLoggingIn ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : 'Sign In'}
          </button>
        </form>

        <div className="pt-2 text-center border-t border-slate-100 dark:border-neutral-900">
          <p className="text-xs text-slate-500">
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="font-bold text-indigo-600 dark:text-indigo-400 transition-colors hover:text-indigo-500 dark:hover:text-indigo-300">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

