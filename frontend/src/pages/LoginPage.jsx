import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { MessageSquare, User, Lock, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const { login, isLoggingIn } = useAuthStore();
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.username || !formData.password) {
      setError('All fields are required');
      return;
    }

    const res = await login(formData);
    if (res.success) {
      navigate('/');
    } else {
      setError(res.error);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-black text-slate-800 dark:text-slate-100 p-4 transition-colors duration-300">
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-slate-200 dark:border-neutral-900 bg-white dark:bg-neutral-950 p-8 text-slate-800 dark:text-slate-100 shadow-xl dark:shadow-2xl">
        <div className="flex flex-col items-center gap-2">
          <svg className="w-12 h-12 rounded-2xl shadow-xl shadow-indigo-500/10" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="charchaLogoGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
            <rect width="32" height="32" rx="9" fill="url(#charchaLogoGrad2)" />
            <path d="M9 9h14c1.1 0 2 .9 2 2v8c0 1.1-.9 2-2 2h-9l-4 4v-4H9c-1.1 0-2-.9-2-2v-8c0-1.1.9-2 2-2zm2 3v1.5h10V12H11zm0 3.5V17h7v-1.5h-7z" fill="#ffffff" />
          </svg>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-800 dark:text-white">
            Welcome Back
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Sign in and jump back into your chats.</p>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 p-3.5 text-xs font-semibold text-rose-400">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-400">Username</label>
            <div className="relative">
              <input
                type="text"
                name="username"
                placeholder="johndoe"
                value={formData.username}
                onChange={handleInputChange}
                className="w-full rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950 py-3 pl-10 pr-4 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 transition-colors focus:border-indigo-500 focus:outline-none"
              />
              <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-400">Password</label>
            <div className="relative">
              <input
                type="password"
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950 py-3 pl-10 pr-4 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 transition-colors focus:border-indigo-500 focus:outline-none"
              />
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoggingIn}
            className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:scale-[1.02] hover:opacity-90 active:scale-95 disabled:opacity-50"
          >
            {isLoggingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign In'}
          </button>
        </form>

        <div className="pt-2 text-center">
          <p className="text-xs text-slate-500">
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="font-semibold text-purple-600 dark:text-purple-400 transition-colors hover:text-purple-500 dark:hover:text-purple-300">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
