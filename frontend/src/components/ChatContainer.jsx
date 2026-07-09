import { useEffect, useRef, useState, useMemo } from 'react';
import { useChatStore } from '../stores/useChatStore';
import { useAuthStore } from '../stores/useAuthStore';
import ChatHeader from './ChatHeader';
import MessageInput from './MessageInput';
import { ChatMessagesSkeleton } from './Skeleton';
import { Check, CheckCheck, Copy, Smile } from 'lucide-react';

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export default function ChatContainer() {
  const { messages, selectedConversation, isMessagesLoading, typingStatus } = useChatStore();
  const { authUser } = useAuthStore();

  const scrollContainerRef = useRef(null);
  const [activeReactionId, setActiveReactionId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Load reactions from local storage
  const [reactions, setReactions] = useState(() => {
    try {
      const saved = localStorage.getItem('chat_bubble_reactions');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);

  // Safe helper to extract user ID from sender field (handles string or object)
  const getSenderId = (sender) => {
    if (!sender) return null;
    return typeof sender === 'object' ? sender._id : sender;
  };

  const getSenderUsername = (sender) => {
    if (!sender) return '';
    return typeof sender === 'object' ? sender.username : 'User';
  };

  const getSenderAvatar = (sender) => {
    if (sender && typeof sender === 'object') return sender.avatar;
    return '';
  };

  // Check typing status for other users
  const typingUsers = selectedConversation ? typingStatus[selectedConversation._id] || {} : {};
  const otherTypingUsers = Object.entries(typingUsers)
    .filter(([id]) => id !== authUser?._id)
    .map(([_, name]) => name);

  const getTypingUserAvatar = (username) => {
    if (!selectedConversation) return null;
    const participant = selectedConversation.participants.find((p) => p.username === username);
    return participant?.avatar || `https://api.dicebear.com/8.x/adventurer/svg?seed=${username}`;
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDividerDate = (date) => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isReadByRecipient = (msg) => {
    if (!selectedConversation || !authUser) return false;
    if (selectedConversation.isGroup) {
      return msg.readBy.some((id) => id !== authUser._id);
    }
    const recipient = selectedConversation.participants.find((p) => p._id !== authUser._id);
    return recipient && msg.readBy.includes(recipient._id);
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const toggleReaction = (messageId, emoji) => {
    setReactions((prev) => {
      const msgReactions = prev[messageId] || [];
      const updated = msgReactions.includes(emoji)
        ? msgReactions.filter((e) => e !== emoji)
        : [...msgReactions, emoji];

      const next = { ...prev, [messageId]: updated };
      localStorage.setItem('chat_bubble_reactions', JSON.stringify(next));
      return next;
    });
  };

  const renderMessageContent = (text, isMe) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className={`underline break-all transition-colors duration-150 font-semibold ${
              isMe ? 'text-indigo-150 hover:text-white' : 'text-indigo-500 hover:text-indigo-400'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  // Group messages chronologically with layout triggers (first/last in consecutive sender group)
  const processedItems = useMemo(() => {
    const items = [];
    let lastDateStr = null;

    const messagesWithGroupInfo = messages.map((msg, i) => {
      const currentSenderId = getSenderId(msg.sender);
      const currentDate = new Date(msg.createdAt);

      const prevMsg = messages[i - 1];
      const isSameSenderAsPrev = prevMsg && getSenderId(prevMsg.sender) === currentSenderId;
      const prevDate = prevMsg ? new Date(prevMsg.createdAt) : null;
      const isWithinPrevLimit = prevDate && (currentDate - prevDate < 2 * 60 * 1000);
      const isSameDateAsPrev = prevDate && (currentDate.toDateString() === prevDate.toDateString());
      const isFirstInGroup = !(isSameSenderAsPrev && isWithinPrevLimit && isSameDateAsPrev);

      const nextMsg = messages[i + 1];
      const isSameSenderAsNext = nextMsg && getSenderId(nextMsg.sender) === currentSenderId;
      const nextDate = nextMsg ? new Date(nextMsg.createdAt) : null;
      const isWithinNextLimit = nextDate && (nextDate - currentDate < 2 * 60 * 1000);
      const isSameDateAsNext = nextDate && (currentDate.toDateString() === nextDate.toDateString());
      const isLastInGroup = !(isSameSenderAsNext && isWithinNextLimit && isSameDateAsNext);

      return {
        ...msg,
        isFirstInGroup,
        isLastInGroup,
      };
    });

    messagesWithGroupInfo.forEach((msg) => {
      const msgDate = new Date(msg.createdAt);
      const msgDateStr = msgDate.toDateString();
      if (msgDateStr !== lastDateStr) {
        items.push({
          type: 'divider',
          id: `divider-${msg._id}`,
          date: msgDate,
        });
        lastDateStr = msgDateStr;
      }
      items.push({
        type: 'message',
        id: msg._id,
        data: msg,
      });
    });

    return items;
  }, [messages]);

  if (isMessagesLoading) {
    return (
      <div className="flex-1 min-h-0 flex flex-col bg-slate-50 dark:bg-black/95">
        <ChatHeader />
        <ChatMessagesSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-slate-50 dark:bg-black select-none">
      <ChatHeader />

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1" ref={scrollContainerRef}>
        {processedItems.length > 0 ? (
          processedItems.map((item) => {
            if (item.type === 'divider') {
              return (
                <div key={item.id} className="flex items-center justify-center my-6 select-none animate-in fade-in duration-300">
                  <div className="h-[1px] flex-1 bg-slate-200 dark:bg-neutral-900/60" />
                  <span className="px-3.5 py-1 rounded-full text-[10px] font-bold text-slate-400 dark:text-neutral-500 bg-white dark:bg-neutral-950 border border-slate-200 dark:border-neutral-900 shadow-xs mx-4">
                    {formatDividerDate(item.date)}
                  </span>
                  <div className="h-[1px] flex-1 bg-slate-200 dark:bg-neutral-900/60" />
                </div>
              );
            }

            const msg = item.data;
            const isMe = getSenderId(msg.sender) === authUser?._id;
            const read = isReadByRecipient(msg);
            const isFirst = msg.isFirstInGroup;
            const isLast = msg.isLastInGroup;

            // WhatsApp-like bubble corner tail style configuration
            let roundedClasses = '';
            if (isMe) {
              roundedClasses = 'rounded-2xl rounded-tr-xs';
            } else {
              roundedClasses = 'rounded-2xl rounded-tl-xs';
            }

            const username = getSenderUsername(msg.sender);
            const avatar = getSenderAvatar(msg.sender);

            return (
              <div
                key={msg._id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} ${
                  isFirst ? 'mt-3.5' : 'mt-0.5'
                } group relative animate-message-appear`}
              >
                {/* Username Header for Group Chats */}
                {isFirst && !isMe && selectedConversation.isGroup && (
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mb-1 ml-11">
                    {username}
                  </span>
                )}

                {/* Message Bubble Container Row */}
                <div className={`flex gap-3 items-end max-w-[80%] md:max-w-[70%] ${isMe ? 'justify-end' : 'justify-start'}`}>
                  {/* Recipient Avatar */}
                  {!isMe && (
                    <div className="w-8 h-8 flex-shrink-0">
                      {isLast && (
                        <img
                          src={avatar || `https://api.dicebear.com/8.x/adventurer/svg?seed=${username}`}
                          alt={username}
                          className="h-8 w-8 rounded-lg object-cover border border-slate-200 dark:border-neutral-850 shadow-xs"
                        />
                      )}
                    </div>
                  )}

                  {/* Bubble Column */}
                  <div className="relative">
                    {/* Hover Action Bar */}
                    <div
                      className={`absolute -top-4.5 flex items-center gap-1 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800/80 shadow-md rounded-xl p-1 z-10 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:-translate-y-0.5 ${
                        activeReactionId === msg._id ? 'opacity-100' : ''
                      } ${isMe ? 'left-3.5' : 'right-3.5'}`}
                    >
                      <button
                        onClick={() => setActiveReactionId(activeReactionId === msg._id ? null : msg._id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-slate-50 dark:hover:bg-neutral-800 transition-all cursor-pointer"
                        title="React"
                      >
                        <Smile className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => handleCopy(msg.content, msg._id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-slate-50 dark:hover:bg-neutral-800 transition-all cursor-pointer"
                        title="Copy message"
                      >
                        {copiedId === msg._id ? (
                          <span className="text-[9px] text-emerald-500 font-bold px-1 select-none">Copied</span>
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    {/* Reaction Selector Popover */}
                    {activeReactionId === msg._id && (
                      <>
                        <div
                          className="fixed inset-0 z-10 cursor-default"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveReactionId(null);
                          }}
                        />
                        <div
                          className={`absolute bottom-full mb-2 flex items-center gap-1 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-805 shadow-xl rounded-2xl p-1.5 z-20 animate-in zoom-in-90 slide-in-from-bottom-2 duration-150 ${
                            isMe ? 'left-3.5' : 'right-3.5'
                          }`}
                        >
                          {EMOJIS.map((emoji) => {
                            const msgReactions = reactions[msg._id] || [];
                            const hasReacted = msgReactions.includes(emoji);
                            return (
                              <button
                                key={emoji}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleReaction(msg._id, emoji);
                                  setActiveReactionId(null);
                                }}
                                className={`p-1 text-base rounded-xl hover:scale-130 hover:bg-indigo-500/10 active:scale-95 transition-all cursor-pointer ${
                                  hasReacted ? 'bg-indigo-500/15' : 'hover:bg-slate-100 dark:hover:bg-neutral-800'
                                }`}
                              >
                                {emoji}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}

                    {/* Text Bubble Content */}
                    <div
                      className={`px-4 py-2.5 shadow-xs border ${roundedClasses} transition-shadow duration-200 hover:shadow-md ${
                        isMe
                          ? 'bg-indigo-600 border-indigo-650 text-white'
                          : 'bg-white dark:bg-neutral-900 text-slate-800 dark:text-neutral-200 border-slate-200 dark:border-neutral-800'
                      }`}
                    >
                      <div className="break-words leading-relaxed text-sm whitespace-pre-wrap select-text font-normal">
                        {renderMessageContent(msg.content, isMe)}
                      </div>

                      {/* Timestamp & Status Icon */}
                      <div className="flex items-center justify-end gap-1.5 mt-1 select-none">
                        <span className={`text-[9px] font-medium tracking-wide ${isMe ? 'text-indigo-200/90' : 'text-slate-400'}`}>
                          {formatTime(msg.createdAt)}
                        </span>
                        {isMe && (
                          <span className="flex-shrink-0">
                            {read ? (
                              <CheckCheck className="h-3 w-3 text-sky-300 animate-pulse" />
                            ) : (
                              <Check className="h-3 w-3 text-indigo-250" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Reaction Badges */}
                {reactions[msg._id] && reactions[msg._id].length > 0 && (
                  <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'} ${!isMe ? 'pl-11' : ''} animate-in zoom-in-95 duration-200`}>
                    {reactions[msg._id].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => toggleReaction(msg._id, emoji)}
                        className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-neutral-300 transition-all duration-200 cursor-pointer hover:border-slate-350 dark:hover:border-neutral-700 hover:scale-110 active:scale-95 shadow-xs"
                      >
                        <span>{emoji}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-neutral-500 text-xs font-semibold gap-2 animate-in fade-in duration-500">
            <svg className="w-8 h-8 opacity-40 animate-float" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-4.03 9-9s-4.03-9-9-9-9 4.03-9 9 4.03 9 9 9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 11.25h.008v.008H8.25v-.008zm3.75 0h.008v.008H12v-.008zm3.75 0h.008v.008h-.008v-.008zm-7.5 4.5a3.75 3.75 0 007.5 0" />
            </svg>
            No messages here yet. Say hello!
          </div>
        )}

        {/* Typing Indicator */}
        {otherTypingUsers.length > 0 && (
          <div className="flex gap-3 justify-start items-end mt-4 animate-in slide-in-from-bottom-3 duration-200">
            <img
              src={getTypingUserAvatar(otherTypingUsers[0])}
              alt={otherTypingUsers[0]}
              className="h-8 w-8 rounded-lg object-cover border border-slate-250 dark:border-neutral-850 flex-shrink-0 shadow-xs"
            />
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 mb-1 ml-1 tracking-wide">
                {otherTypingUsers.join(', ')} is typing
              </span>
              <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-xs border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-2.5 text-slate-450 dark:text-slate-350 shadow-xs">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      <MessageInput />
    </div>
  );
}

