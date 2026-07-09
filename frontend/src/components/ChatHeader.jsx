import { useChatStore } from '../stores/useChatStore';
import { useAuthStore } from '../stores/useAuthStore';
import { ArrowLeft, Users } from 'lucide-react';

export default function ChatHeader() {
  const { selectedConversation, setSelectedConversation } = useChatStore();
  const { authUser, onlineUsers } = useAuthStore();

  if (!selectedConversation) return null;

  let recipient = null;
  if (!selectedConversation.isGroup) {
    recipient = selectedConversation.participants.find((p) => p._id !== authUser._id);
  }

  const chatName = selectedConversation.isGroup
    ? selectedConversation.groupName
    : recipient?.username || 'Unknown Chat';

  const chatAvatar = selectedConversation.isGroup
    ? `https://api.dicebear.com/8.x/initials/svg?seed=${selectedConversation.groupName}`
    : recipient?.avatar || `https://api.dicebear.com/8.x/adventurer/svg?seed=${chatName}`;

  const isOnline = !selectedConversation.isGroup && recipient && onlineUsers.includes(recipient._id);

  return (
    <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-neutral-900 bg-white/90 dark:bg-black/40 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="flex items-center gap-3">
        {/* Back navigation button for mobile layout */}
        <button
          onClick={() => setSelectedConversation(null)}
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-neutral-900 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-all duration-200 md:hidden cursor-pointer active:scale-90"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="relative">
          <img src={chatAvatar} alt={chatName} className="h-10 w-10 rounded-xl object-cover border border-slate-200 dark:border-neutral-800/80 shadow-xs" />
          {isOnline && (
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white dark:border-neutral-950 animate-pulse-glow" />
          )}
        </div>

        <div className="text-left">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm tracking-wide">{chatName}</h3>
          <p className="text-xs font-semibold text-slate-450 dark:text-slate-400 mt-0.5">
            {selectedConversation.isGroup ? (
              <span className="flex items-center gap-1.5 font-bold">
                <Users className="h-3.5 w-3.5" />
                {selectedConversation.participants.length} participants
              </span>
            ) : isOnline ? (
              <span className="text-emerald-500 font-bold tracking-wide">Online</span>
            ) : (
              <span className="text-slate-400 font-medium">Offline</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
