import { useToastStore } from '../stores/useToastStore';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        let bgColor = 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-slate-200';
        let Icon = Info;
        let iconColor = 'text-indigo-500';

        if (toast.type === 'success') {
          bgColor = 'bg-emerald-50/95 dark:bg-emerald-950/90 border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-250';
          Icon = CheckCircle2;
          iconColor = 'text-emerald-500 dark:text-emerald-400';
        } else if (toast.type === 'error') {
          bgColor = 'bg-rose-50/95 dark:bg-rose-950/90 border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-250';
          Icon = AlertCircle;
          iconColor = 'text-rose-500 dark:text-rose-400';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border shadow-lg ${bgColor} transform transition-all duration-300 animate-in slide-in-from-right-5 fade-in-50`}
            role="alert"
          >
            <div className="flex items-center gap-2.5">
              <Icon className={`h-5 w-5 ${iconColor} shrink-0`} />
              <p className="text-xs font-semibold leading-tight tracking-wide">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/30 transition-colors cursor-pointer shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
