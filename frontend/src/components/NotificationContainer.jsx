import { useNotificationStore } from '../stores/useNotificationStore';
import { X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

export default function NotificationContainer() {
  const notifications = useNotificationStore((state) => state.notifications);
  const dismissNotification = useNotificationStore((state) => state.dismissNotification);
  const [_, setSearchParams] = useSearchParams();

  if (notifications.length === 0) return null;

  const handleNotificationClick = (notification) => {
    setSearchParams({ chat: notification.conversation._id });
    window.focus();
    dismissNotification(notification.id);
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          onClick={() => handleNotificationClick(notification)}
          className="pointer-events-auto flex items-center justify-between gap-3 p-3 bg-white/95 dark:bg-zinc-900/95 border border-slate-200 dark:border-zinc-800/80 rounded-2xl shadow-xl cursor-pointer hover:scale-[1.02] hover:shadow-2xl transition-all duration-200 animate-notification-slide-in"
        >
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={notification.senderAvatar || `https://api.dicebear.com/8.x/adventurer/svg?seed=${notification.senderName}`}
              alt={notification.senderName}
              className="h-10 w-10 rounded-xl object-cover border border-slate-100 dark:border-neutral-800 shrink-0"
            />
            <div className="text-left min-w-0">
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                {notification.senderName}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                {notification.messagePreview}
              </p>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              dismissNotification(notification.id);
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
