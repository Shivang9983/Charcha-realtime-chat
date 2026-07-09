import { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../stores/useChatStore';
import { useAuthStore } from '../stores/useAuthStore';
import { Send } from 'lucide-react';

export default function MessageInput() {
  const [content, setContent] = useState('');
  const { sendMessage, selectedConversation } = useChatStore();
  const { authUser, socket } = useAuthStore();

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
    <form onSubmit={handleSend} className="flex items-center gap-2.5 border-t border-slate-200/85 dark:border-neutral-900 bg-white/90 dark:bg-black/30 backdrop-blur-md p-4 animate-in fade-in duration-200">
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
  );
}
