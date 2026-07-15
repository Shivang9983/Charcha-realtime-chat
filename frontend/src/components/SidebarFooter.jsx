import { useNavigate } from 'react-router-dom';
import { Settings, LogOut } from 'lucide-react';

export default function SidebarFooter({ authUser, handleLogout }) {
  const navigate = useNavigate();

  const handleProfileClick = () => {
    navigate('/profile');
  };

  return (
    <div className="p-3 border-t border-slate-200/80 dark:border-neutral-900 bg-slate-50/20 dark:bg-neutral-955/20 shrink-0">
      <div className="glass-effect rounded-2xl p-2.5 flex items-center justify-between shadow-md border border-slate-200/60 dark:border-neutral-800/40">
        {/* Clickable Profile Section */}
        <button
          onClick={handleProfileClick}
          className="flex flex-1 items-center gap-2.5 cursor-pointer text-left group min-w-0 p-1 rounded-xl transition-all duration-200 hover:bg-slate-200/40 dark:hover:bg-neutral-800/45 active:scale-98"
        >
          <div className="relative shrink-0">
            <img
              src={authUser.avatar || `https://api.dicebear.com/8.x/adventurer/svg?seed=${authUser.username}`}
              alt={authUser.username}
              className="h-9 w-9 rounded-xl border border-indigo-500/30 object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {/* Green Online Indicator */}
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-neutral-950 animate-pulse-glow" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm leading-tight truncate transition-colors group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
              {authUser.username}
            </h4>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider leading-none mt-0.5">
              My Profile
            </p>
          </div>
        </button>

        {/* User Action Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => navigate('/profile')}
            className="cursor-pointer rounded-xl p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-all duration-200 hover:scale-110 active:scale-95 hover:bg-slate-200/40 dark:hover:bg-neutral-800/40"
            title="Settings"
          >
            <Settings className="h-4.5 w-4.5" />
          </button>
          
          <button
            onClick={handleLogout}
            className="cursor-pointer rounded-xl p-2 text-rose-500/80 hover:text-rose-600 dark:text-rose-400/80 dark:hover:text-rose-400 transition-all duration-200 hover:scale-110 active:scale-95 hover:bg-rose-500/10"
            title="Logout"
          >
            <LogOut className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
