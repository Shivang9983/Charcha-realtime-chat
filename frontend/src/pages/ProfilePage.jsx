import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { useToastStore } from '../stores/useToastStore';
import { ArrowLeft, User, Mail, Save, Loader2, Sparkles } from 'lucide-react';

export default function ProfilePage() {
  const { authUser, updateProfile, isUpdatingProfile } = useAuthStore();
  const { addToast } = useToastStore();
  const [username, setUsername] = useState(authUser.username);
  const [avatarSeed, setAvatarSeed] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
  }, []);

  const previewAvatarUrl = avatarSeed.trim()
    ? `https://api.dicebear.com/8.x/adventurer/svg?seed=${avatarSeed}`
    : authUser.avatar;

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!username.trim()) {
      setError('Username cannot be empty');
      addToast('Username cannot be empty', 'error');
      return;
    }

    const updates = { username };
    if (avatarSeed.trim()) {
      updates.avatar = previewAvatarUrl;
    }

    const res = await updateProfile(updates);
    if (res.success) {
      setSuccess('Profile updated successfully.');
      addToast('Profile updated successfully.', 'success');
      setAvatarSeed('');
    } else {
      setError(res.error);
      addToast(res.error || 'Update failed', 'error');
    }
  };

  const handleRandomizeAvatar = () => {
    const randomSeed = Math.random().toString(36).substring(7);
    setAvatarSeed(randomSeed);
    addToast('New avatar generated!', 'success');
  };

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className={`flex min-h-screen flex-col items-center justify-center bg-slate-50 dark:bg-black text-slate-800 dark:text-slate-100 p-4 transition-all duration-500 ease-out ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      <div className="relative w-full max-w-md space-y-6 rounded-3xl border border-slate-200 dark:border-neutral-900 bg-white dark:bg-neutral-950 p-5 sm:p-8 max-h-[92vh] sm:max-h-none overflow-y-auto sm:overflow-visible text-slate-800 dark:text-slate-100 shadow-xl dark:shadow-2xl select-none animate-page-entrance">
        <button
          onClick={handleBack}
          className="absolute left-6 top-6 cursor-pointer rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-100 dark:bg-neutral-900 p-2.5 text-slate-500 dark:text-slate-400 transition-all hover:scale-105 hover:bg-slate-250 dark:hover:bg-neutral-800 hover:text-slate-700 dark:hover:text-slate-200 active:scale-95 shadow-xs"
          title="Go Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="pt-4 text-center">
          <h1 className="text-xl font-black tracking-wide text-slate-800 dark:text-white">Edit Profile</h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-450 font-medium">Update the name and avatar other people see in chat.</p>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 p-3.5 text-xs font-bold text-rose-500 dark:text-rose-400 animate-in fade-in duration-200">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3.5 text-xs font-bold text-emerald-500 dark:text-emerald-450 animate-in fade-in duration-200">
            {success}
          </div>
        )}

        <div className="flex flex-col items-center gap-3">
          <div className="group relative">
            <img
              src={previewAvatarUrl}
              alt="Avatar preview"
              className="h-24 w-24 rounded-2xl border-2 border-indigo-500/50 bg-slate-100 dark:bg-slate-900/60 p-1 object-cover transition-all duration-300 avatar-ring-premium group-hover:scale-105"
            />
            <button
              type="button"
              onClick={handleRandomizeAvatar}
              className="absolute -bottom-2 -right-2 cursor-pointer rounded-xl border border-slate-250 dark:border-neutral-800 bg-gradient-to-r from-indigo-500 to-purple-650 p-2.5 text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:rotate-12 active:scale-90"
              title="Generate Random Avatar"
            >
              <Sparkles className="h-4 w-4" />
            </button>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Avatar Preview
          </span>
        </div>

        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="space-y-1.5 text-left opacity-60">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Email Address</label>
            <div className="relative">
              <input
                type="email"
                disabled
                value={authUser.email}
                className="w-full cursor-not-allowed rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950 py-3.5 pl-10 pr-4 text-sm text-slate-400"
              />
              <Mail className="absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Username</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950 py-3.5 pl-10 pr-4 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-655 transition-all duration-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/20"
              />
              <User className="absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Avatar Seed (Optional)</label>
            <input
              type="text"
              placeholder="Try a word like sunrise or comet"
              value={avatarSeed}
              onChange={(e) => setAvatarSeed(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950 px-4 py-3.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-655 transition-all duration-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/20"
            />
          </div>

          <button
            type="submit"
            disabled={isUpdatingProfile}
            className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-650 py-3.5 text-sm font-bold text-white shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50"
          >
            {isUpdatingProfile ? (
              <Loader2 className="h-4.5 w-4.5 animate-spin" />
            ) : (
              <>
                <Save className="h-4.5 w-4.5" />
                Save Changes
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
