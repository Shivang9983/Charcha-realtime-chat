import { useNavigate } from 'react-router-dom';
import { Settings, LogOut } from 'lucide-react';

export default function SidebarFooter({ handleLogout }) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-2 border-t border-slate-200/80 dark:border-neutral-900 bg-white dark:bg-black py-2.5 px-3.5 shrink-0">
      <button
        onClick={() => navigate('/profile')}
        className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 bg-transparent hover:bg-slate-100 dark:hover:bg-neutral-900/50 transition-all duration-200 hover:scale-[1.02] active:scale-98"
        title="Settings"
      >
        <Settings className="h-4 w-4" />
        <span>Settings</span>
      </button>
      
      <button
        onClick={handleLogout}
        className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-semibold text-rose-500/90 hover:text-rose-600 dark:text-rose-450 dark:hover:text-rose-350 bg-transparent hover:bg-rose-500/10 transition-all duration-200 hover:scale-[1.02] active:scale-98"
        title="Logout"
      >
        <LogOut className="h-4 w-4" />
        <span>Logout</span>
      </button>
    </div>
  );
}
