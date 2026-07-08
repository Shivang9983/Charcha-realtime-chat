import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { ArrowLeft, User, Mail, Save, Loader2, Sparkles } from 'lucide-react';

export default function ProfilePage() {
  const { authUser, updateProfile, isUpdatingProfile } = useAuthStore();
  const [username, setUsername] = useState(authUser.username);
  const [avatarSeed, setAvatarSeed] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const previewAvatarUrl = avatarSeed.trim()
    ? `https://api.dicebear.com/8.x/adventurer/svg?seed=${avatarSeed}`
    : authUser.avatar;

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!username.trim()) {
      setError('Username cannot be empty');
      return;
    }

    const updates = { username };
    if (avatarSeed.trim()) {
      updates.avatar = previewAvatarUrl;
    }

    const res = await updateProfile(updates);
    if (res.success) {
      setSuccess('Profile updated successfully.');
      setAvatarSeed('');
    } else {
      setError(res.error);
    }
  };

  const handleRandomizeAvatar = () => {
    const randomSeed = Math.random().toString(36).substring(7);
    setAvatarSeed(randomSeed);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 dark:bg-black text-slate-800 dark:text-slate-100 p-4 transition-colors duration-300">
      <div className="relative w-full max-w-md space-y-6 rounded-3xl border border-slate-200 dark:border-neutral-900 bg-white dark:bg-neutral-950 p-8 text-slate-800 dark:text-slate-100 shadow-xl dark:shadow-2xl select-none">
        <button
          onClick={() => navigate('/')}
          className="absolute left-6 top-6 cursor-pointer rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-100 dark:bg-neutral-900 p-2 text-slate-500 dark:text-slate-400 transition-all hover:scale-105 hover:bg-slate-200 dark:hover:bg-neutral-850 hover:text-slate-700 dark:hover:text-slate-200 active:scale-95 animate-in fade-in"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="pt-4 text-center">
          <h1 className="text-xl font-bold tracking-wide text-slate-800 dark:text-white">Edit Profile</h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Update the name and avatar other people see in chat.</p>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 p-3.5 text-xs font-semibold text-rose-400">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3.5 text-xs font-semibold text-emerald-400">
            {success}
          </div>
        )}

        <div className="flex flex-col items-center gap-3">
          <div className="group relative">
            <img
              src={previewAvatarUrl}
              alt="Avatar preview"
              className="h-24 w-24 rounded-2xl border-2 border-indigo-500/50 bg-slate-100 dark:bg-slate-900/60 p-1 object-cover transition-transform group-hover:scale-105"
            />
            <button
              type="button"
              onClick={handleRandomizeAvatar}
              className="absolute -bottom-2 -right-2 cursor-pointer rounded-xl border border-slate-200 dark:border-neutral-800 bg-gradient-to-r from-indigo-500 to-purple-600 p-2 text-white shadow-md transition-all hover:opacity-90 active:scale-90"
              title="Generate Random Avatar"
            >
              <Sparkles className="h-4 w-4" />
            </button>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-450 dark:text-slate-400">
            Avatar Preview
          </span>
        </div>

        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="space-y-1.5 text-left opacity-60">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-400">Email Address</label>
            <div className="relative">
              <input
                type="email"
                disabled
                value={authUser.email}
                className="w-full cursor-not-allowed rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950 py-3 pl-10 pr-4 text-sm text-slate-400"
              />
              <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-450 dark:text-slate-500" />
            </div>
          </div>

          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-400">Username</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950 py-3 pl-10 pr-4 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-450 dark:placeholder-slate-600 transition-colors focus:border-indigo-500 focus:outline-none"
              />
              <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-400">Avatar Seed (Optional)</label>
            <input
              type="text"
              placeholder="Try a word like sunrise or comet"
              value={avatarSeed}
              onChange={(e) => setAvatarSeed(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950 px-4 py-3 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-450 dark:placeholder-slate-600 transition-colors focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isUpdatingProfile}
            className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:scale-[1.02] hover:opacity-95 active:scale-95 disabled:opacity-50"
          >
            {isUpdatingProfile ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
