import { useEffect, useRef, useState, useMemo } from 'react';
import { useChatStore } from '../stores/useChatStore';
import { useAuthStore } from '../stores/useAuthStore';
import ChatHeader from './ChatHeader';
import MessageInput from './MessageInput';
import { Check, CheckCheck, Loader2, Copy, Smile } from 'lucide-react';

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
    } catch (e) {
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
            className={`underline break-all transition-colors duration-150 font-medium ${
              isMe ? 'text-indigo-200 hover:text-white' : 'text-indigo-400 hover:text-indigo-300'
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
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            <p className="text-sm text-slate-400 font-medium">Loading messages...</p>
          </div>
        </div>
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-slate-50 dark:bg-black">
      <ChatHeader />

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1" ref={scrollContainerRef}>
        {processedItems.length > 0 ? (
          processedItems.map((item) => {
            if (item.type === 'divider') {
              return (
                <div key={item.id} className="flex items-center justify-center my-6 select-none">
                  <div className="h-[1px] flex-1 bg-slate-200 dark:bg-neutral-800/80" />
                  <span className="px-3 py-1 rounded-full text-[10px] font-semibold text-slate-400 dark:text-neutral-500 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-xs mx-4">
                    {formatDividerDate(item.date)}
                  </span>
                  <div className="h-[1px] flex-1 bg-slate-200 dark:bg-neutral-800/80" />
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
              if (isFirst && isLast) roundedClasses = 'rounded-2xl rounded-tr-xs';
              else if (isFirst) roundedClasses = 'rounded-2xl rounded-tr-xs';
              else if (isLast) roundedClasses = 'rounded-2xl rounded-tr-xs';
              else roundedClasses = 'rounded-2xl rounded-tr-xs';
            } else {
              if (isFirst && isLast) roundedClasses = 'rounded-2xl rounded-tl-xs';
              else if (isFirst) roundedClasses = 'rounded-2xl rounded-tl-xs';
              else if (isLast) roundedClasses = 'rounded-2xl rounded-tl-xs';
              else roundedClasses = 'rounded-2xl rounded-tl-xs';
            }

            const username = getSenderUsername(msg.sender);
            const avatar = getSenderAvatar(msg.sender);

            return (
              <div
                key={msg._id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} ${
                  isFirst ? 'mt-3' : 'mt-0.5'
                } group relative`}
              >
                {/* Username Header for Group Chats */}
                {isFirst && !isMe && selectedConversation.isGroup && (
                  <span className="text-[10px] font-semibold text-indigo-500 dark:text-indigo-400 mb-1 ml-11">
                    {username}
                  </span>
                )}

                {/* Message Bubble Container Row */}
                <div className={`flex gap-3 items-end max-w-[75%] ${isMe ? 'justify-end' : 'justify-start'}`}>
                  {/* Recipient Avatar */}
                  {!isMe && (
                    <div className="w-8 h-8 flex-shrink-0">
                      {isLast && (
                        <img
                          src={avatar || `https://api.dicebear.com/8.x/adventurer/svg?seed=${username}`}
                          alt={username}
                          className="h-8 w-8 rounded-lg object-cover border border-slate-200 dark:border-neutral-800"
                        />
                      )}
                    </div>
                  )}

                  {/* Bubble Column */}
                  <div className="relative">
                    {/* Hover Action Bar */}
                    <div
                      className={`absolute -top-4 flex items-center gap-1 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm rounded-lg p-0.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${
                        activeReactionId === msg._id ? 'opacity-100' : ''
                      } ${isMe ? 'left-3' : 'right-3'}`}
                    >
                      <button
                        onClick={() => setActiveReactionId(activeReactionId === msg._id ? null : msg._id)}
                        className="p-1 rounded text-slate-400 hover:text-indigo-500 transition-colors cursor-pointer"
                        title="React"
                      >
                        <Smile className="h-3.5 w-3.5" />
                      </button>

                      <button
                        onClick={() => handleCopy(msg.content, msg._id)}
                        className="p-1 rounded text-slate-400 hover:text-indigo-500 transition-colors cursor-pointer"
                        title="Copy message"
                      >
                        {copiedId === msg._id ? (
                          <span className="text-[9px] text-emerald-500 font-bold px-1 select-none">Copied</span>
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
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
                          className={`absolute bottom-full mb-1.5 flex items-center gap-1 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-lg rounded-xl p-1 z-20 animate-in zoom-in-95 duration-100 ${
                            isMe ? 'left-3' : 'right-3'
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
                                className={`p-1 text-base rounded-lg hover:scale-125 transition-transform cursor-pointer ${
                                  hasReacted ? 'bg-indigo-500/10' : 'hover:bg-slate-100 dark:hover:bg-neutral-800'
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
                      className={`px-3.5 py-2 transition-all duration-200 ${roundedClasses} ${
                        isMe
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white dark:bg-neutral-900 text-slate-800 dark:text-neutral-200 border border-slate-200 dark:border-neutral-800'
                      }`}
                    >
                      <div className="break-words leading-relaxed text-sm whitespace-pre-wrap select-text">
                        {renderMessageContent(msg.content, isMe)}
                      </div>

                      {/* Timestamp & Status Icon */}
                      <div className="flex items-center justify-end gap-1.5 mt-1 select-none">
                        <span className={`text-[9px] ${isMe ? 'text-indigo-200/90' : 'text-slate-400'}`}>
                          {formatTime(msg.createdAt)}
                        </span>
                        {isMe && (
                          <span className="flex-shrink-0">
                            {read ? (
                              <CheckCheck className="h-3 w-3 text-sky-300" />
                            ) : (
                              <Check className="h-3 w-3 text-indigo-200" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Reaction Badges */}
                {reactions[msg._id] && reactions[msg._id].length > 0 && (
                  <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'} ${!isMe ? 'pl-11' : ''}`}>
                    {reactions[msg._id].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => toggleReaction(msg._id, emoji)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-neutral-300 transition-all cursor-pointer hover:border-slate-300 dark:hover:border-neutral-700"
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
          <div className="h-full flex items-center justify-center text-slate-400 text-xs">
            No messages here yet. Say hello!
          </div>
        )}

        {/* Typing Indicator */}
        {otherTypingUsers.length > 0 && (
          <div className="flex gap-3 justify-start items-end mt-3">
            <img
              src={getTypingUserAvatar(otherTypingUsers[0])}
              alt={otherTypingUsers[0]}
              className="h-8 w-8 rounded-lg object-cover border border-slate-200 dark:border-neutral-800 flex-shrink-0"
            />
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-semibold text-slate-400 mb-1 ml-1">
                {otherTypingUsers.join(', ')} is typing
              </span>
              <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-xs border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-2.5 text-slate-600 dark:text-slate-300">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      <MessageInput />
    </div>
  );
}
