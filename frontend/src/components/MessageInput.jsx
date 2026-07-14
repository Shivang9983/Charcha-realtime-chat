import { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../stores/useChatStore';
import { useAuthStore } from '../stores/useAuthStore';
import { Send, X } from 'lucide-react';

export default function MessageInput() {
  const [content, setContent] = useState('');
  const sendMessage = useChatStore((state) => state.sendMessage);
  const selectedConversation = useChatStore((state) => state.selectedConversation);
  const replyingToMessage = useChatStore((state) => state.replyingToMessage);
  const setReplyingToMessage = useChatStore((state) => state.setReplyingToMessage);
  const authUser = useAuthStore((state) => state.authUser);
  const socket = useAuthStore((state) => state.socket);

  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    return () => {
      if (isTypingRef.current && socket && selectedConversation) {
        socket.emit('stopTyping', {
          conversationId: selectedConversation._id,
          userId: authUser._id,
        });
      }
      isTypingRef.current = false;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [selectedConversation, socket, authUser]);

  const handleInputChange = (e) => {
    setContent(e.target.value);

    if (!socket || !selectedConversation) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit('typing', {
        conversationId: selectedConversation._id,
        userId: authUser._id,
        username: authUser.username,
      });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stopTyping', {
        conversationId: selectedConversation._id,
        userId: authUser._id,
      });
      isTypingRef.current = false;
    }, 2000);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    const messageContent = content;
    setContent('');

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (isTypingRef.current && socket && selectedConversation) {
      socket.emit('stopTyping', {
        conversationId: selectedConversation._id,
        userId: authUser._id,
      });
      isTypingRef.current = false;
    }

    await sendMessage(messageContent);
  };

  return (
    <div className="flex flex-col border-t border-slate-200/85 dark:border-neutral-900 bg-white/90 dark:bg-black/30 backdrop-blur-md animate-in fade-in duration-200">
      {replyingToMessage && (
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-slate-150/70 dark:border-neutral-900 bg-slate-50/50 dark:bg-neutral-950/20 text-xs animate-in slide-in-from-bottom-2 duration-150">
          <div className="flex flex-col border-l-3 border-indigo-650 dark:border-indigo-500 pl-3 min-w-0">
            <span className="font-bold text-indigo-650 dark:text-indigo-400">
              Replying to {replyingToMessage.sender?.username || 'User'}
            </span>
            <span className="text-slate-500 dark:text-neutral-400 truncate max-w-[280px] sm:max-w-[480px]">
              {replyingToMessage.content}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setReplyingToMessage(null)}
            className="text-slate-450 hover:text-slate-650 dark:hover:text-neutral-300 p-1 rounded-full hover:bg-slate-150 dark:hover:bg-neutral-850 transition-colors cursor-pointer shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <form onSubmit={handleSend} className="flex items-center gap-2.5 p-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Type a message..."
            value={content}
            onChange={handleInputChange}
            className="w-full rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950 px-4 py-3 pr-12 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-650 transition-all duration-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 shadow-xs"
          />
        </div>
        <button
          type="submit"
          disabled={!content.trim()}
          className="flex-shrink-0 cursor-pointer rounded-xl bg-indigo-600 p-3 text-white transition-all duration-200 hover:scale-105 hover:bg-indigo-500 hover:shadow-md active:scale-95 disabled:opacity-40 shadow-sm shrink-0"
        >
          <Send className="h-4.5 w-4.5" />
        </button>
      </form>
    </div>
  );
}
