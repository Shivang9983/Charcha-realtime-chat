import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useChatStore } from '../stores/useChatStore';
import Sidebar from '../components/Sidebar';
import ChatContainer from '../components/ChatContainer';
import Logo from '../components/Logo';


export default function HomePage() {
  const selectedConversation = useChatStore((state) => state.selectedConversation);
  const setSelectedConversation = useChatStore((state) => state.setSelectedConversation);
  const conversations = useChatStore((state) => state.conversations);
  
  const [searchParams, setSearchParams] = useSearchParams();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const chatIdParam = searchParams.get('chat');

  // Sync from URL search params to Store state (Single Source of Truth)
  useEffect(() => {
    if (chatIdParam) {
      const found = conversations.find((c) => String(c._id) === chatIdParam);
      if (found) {
        if (!selectedConversation || String(selectedConversation._id) !== chatIdParam) {
          setSelectedConversation(found);
        }
      } else {
        if (conversations.length > 0) {
          if (selectedConversation) {
            setSelectedConversation(null);
          }
          setSearchParams({});
        }
      }
    } else {
      if (selectedConversation) {
        setSelectedConversation(null);
      }
    }
  }, [chatIdParam, conversations, selectedConversation, setSelectedConversation, setSearchParams]);

  return (
    <div className={`fixed inset-0 flex bg-white dark:bg-black overflow-hidden text-slate-900 dark:text-slate-100 transition-opacity duration-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      {/* Sidebar - Hidden on mobile if a chat is active */}
      <div className={`flex-shrink-0 h-full w-full md:w-80 transition-transform duration-300 ${selectedConversation ? 'hidden md:flex' : 'flex md:flex'}`}>
        <Sidebar />
      </div>

      {/* Chat pane or placeholder */}
      <div className={`flex-1 min-h-0 h-full flex flex-col transition-all duration-300 ${!selectedConversation ? 'hidden md:flex' : 'w-full md:w-auto'}`}>
        {selectedConversation ? (
          <ChatContainer />
        ) : (
          <div className="relative flex-1 flex flex-col items-center justify-center bg-slate-50 dark:bg-neutral-950/20 p-8 space-y-5 select-none overflow-hidden animate-page-entrance">
            {/* Glowing blur background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-indigo-500/10 dark:bg-indigo-600/5 blur-3xl pointer-events-none" />
            
            <div className="relative z-10 animate-float flex flex-col items-center">
              <div className="relative flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-[0_10px_30px_rgba(99,102,241,0.2)]">
                <Logo className="w-11 h-11 text-white" />
              </div>
            </div>

            <div className="text-center max-w-sm space-y-2 relative z-10">
              <h2 className="text-2xl font-black tracking-wide text-slate-800 dark:text-slate-100">Welcome to Charcha</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                Select a conversation from the sidebar to start chatting.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

