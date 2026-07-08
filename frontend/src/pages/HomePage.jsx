import { useChatStore } from '../stores/useChatStore';
import Sidebar from '../components/Sidebar';
import ChatContainer from '../components/ChatContainer';
import { MessageSquare } from 'lucide-react';

export default function HomePage() {
  const { selectedConversation } = useChatStore();

  return (
    <div className="fixed inset-0 flex bg-white dark:bg-black overflow-hidden text-slate-900 dark:text-slate-100">
      {/* Sidebar - Hidden on mobile if a chat is active */}
      <div className={`${selectedConversation ? 'hidden md:flex' : 'flex md:flex'} flex-shrink-0 h-full w-full md:w-80`}>
        <Sidebar />
      </div>

      {/* Chat pane or placeholder */}
      <div className={`flex-1 min-h-0 h-full flex flex-col ${!selectedConversation ? 'hidden md:flex' : 'w-full md:w-auto'}`}>
        {selectedConversation ? (
          <ChatContainer />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 dark:bg-neutral-950/40 p-8 space-y-4 select-none">
            <svg className="w-16 h-16 rounded-3xl shadow-xl shadow-indigo-500/10" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="charchaHomeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
              <rect width="32" height="32" rx="9" fill="url(#charchaHomeGrad)" />
              <path d="M9 9h14c1.1 0 2 .9 2 2v8c0 1.1-.9 2-2 2h-9l-4 4v-4H9c-1.1 0-2-.9-2-2v-8c0-1.1.9-2 2-2zm2 3v1.5h10V12H11zm0 3.5V17h7v-1.5h-7z" fill="#ffffff" />
            </svg>
            <div className="text-center max-w-sm space-y-1">
              <h2 className="text-xl font-bold tracking-wide text-slate-800 dark:text-slate-200">Start Messaging</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Select a contact or group from the sidebar to begin exchanging messages in real-time.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
