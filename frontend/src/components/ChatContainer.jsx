import { useEffect, useRef, useState, useMemo, memo, useCallback } from 'react';
import { useChatStore } from '../stores/useChatStore';
import { useAuthStore } from '../stores/useAuthStore';
import ChatHeader from './ChatHeader';
import MessageInput from './MessageInput';
import { ChatMessagesSkeleton } from './Skeleton';
import { Check, CheckCheck, Copy, Smile, Ban, Edit3, Trash2, Reply, Loader2, X } from 'lucide-react';
import { useToastStore } from '../stores/useToastStore';

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

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

const getSenderId = (sender) => {
  if (!sender) return null;
  const sId = typeof sender === 'object' ? sender._id : sender;
  return sId ? String(sId) : null;
};

const getSenderUsername = (sender) => {
  if (!sender) return '';
  return typeof sender === 'object' ? sender.username : 'User';
};

const getSenderAvatar = (sender) => {
  if (sender && typeof sender === 'object') return sender.avatar;
  return '';
};

const getTypingUserAvatar = (username, selectedConversation) => {
  if (!selectedConversation || !selectedConversation.participants) return null;
  const participant = selectedConversation.participants.find((p) => p.username === username);
  return participant?.avatar || `https://api.dicebear.com/8.x/adventurer/svg?seed=${username}`;
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

const MessageBubble = memo(({
  msg,
  isMe,
  read,
  isFirst,
  isLast,
  isGroup,
  username,
  avatar,
  isReactionSelectorOpen,
  isCopied,
  isEditing,
  editContent,
  setEditContent,
  messageReactions,
  onContextMenu,
  onTouchStart,
  onTouchEnd,
  onTouchMove,
  onSmileClick,
  onCopyClick,
  onEmojiSelect,
  onReactionBadgeClick,
  onCancelEdit,
  onSaveEdit,
  onEditKeyDown,
  onReplyBadgeClick,
  onImageClick,
  onRetryClick,
  onDeleteOptimistic,
}) => {
  let roundedClasses = isMe ? 'rounded-2xl rounded-tr-xs' : 'rounded-2xl rounded-tl-xs';

  return (
    <div
      id={`msg-${msg._id}`}
      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} ${
        isFirst ? 'mt-3.5' : 'mt-0.5'
      } group relative animate-message-appear rounded-xl transition-colors duration-300`}
    >
      {/* Username Header for Group Chats */}
      {isFirst && !isMe && isGroup && (
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
                className="h-8 w-8 rounded-lg object-cover border border-slate-200 dark:border-neutral-855 shadow-xs"
              />
            )}
          </div>
        )}

        {/* Bubble Column */}
        <div
          className="relative"
          onContextMenu={(e) => onContextMenu(e, msg)}
          onTouchStart={(e) => onTouchStart(e, msg)}
          onTouchEnd={onTouchEnd}
          onTouchMove={onTouchMove}
        >
          {/* Hover Action Bar */}
          {!msg.isDeleted && (
            <div
              className={`absolute -top-4.5 flex items-center gap-1 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800/80 shadow-md rounded-xl p-1 z-10 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:-translate-y-0.5 ${
                isReactionSelectorOpen ? 'opacity-100' : ''
              } ${isMe ? 'left-3.5' : 'right-3.5'}`}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSmileClick(msg._id);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-slate-50 dark:hover:bg-neutral-800 transition-all cursor-pointer"
                title="React"
              >
                <Smile className="h-4 w-4" />
              </button>

              <button
                onClick={() => onCopyClick(msg.content, msg._id)}
                className="p-1 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-slate-50 dark:hover:bg-neutral-800 transition-all cursor-pointer"
                title="Copy message"
              >
                {isCopied ? (
                  <span className="text-[9px] text-emerald-500 font-bold px-1 select-none">Copied</span>
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
          )}

          {/* Reaction Selector Popover */}
          {!msg.isDeleted && isReactionSelectorOpen && (
            <>
              <div
                className="fixed inset-0 z-10 cursor-default"
                onClick={() => onSmileClick(msg._id)}
              />
              <div
                className={`absolute bottom-full mb-2 flex items-center gap-1 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-805 shadow-xl rounded-2xl p-1.5 z-20 animate-in zoom-in-90 slide-in-from-bottom-2 duration-150 ${
                  isMe ? 'left-3.5' : 'right-3.5'
                }`}
              >
                {EMOJIS.map((emoji) => {
                  const hasReacted = messageReactions.includes(emoji);
                  return (
                    <button
                      key={emoji}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEmojiSelect(msg._id, emoji);
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
          {msg.isDeleted ? (
            <div
              className={`px-4 py-2.5 shadow-xs border ${roundedClasses} ${
                isMe
                  ? 'bg-indigo-650/15 border-indigo-650/20 text-white/50'
                  : 'bg-white/50 dark:bg-neutral-955 text-slate-400 dark:text-neutral-500 border-slate-200 dark:border-neutral-900'
              }`}
            >
              <div className="flex items-center gap-2 italic text-sm font-normal">
                <Ban className="h-4 w-4 opacity-60 flex-shrink-0" />
                <span>{isMe ? 'You deleted this message' : 'This message was deleted'}</span>
              </div>
              {/* Preserve original timestamp */}
              <div className="flex items-center justify-end gap-1.5 mt-1 select-none">
                <span className="text-[9px] font-medium tracking-wide opacity-60">
                  {formatTime(msg.createdAt)}
                </span>
              </div>
            </div>
          ) : isEditing ? (
            <div
              className={`px-4 py-2.5 shadow-xs border ${roundedClasses} min-w-[200px] md:min-w-[280px] ${
                isMe
                  ? 'bg-indigo-600 border-indigo-650 text-white'
                  : 'bg-white dark:bg-neutral-900 text-slate-800 dark:text-neutral-200 border-slate-200 dark:border-neutral-800'
              }`}
            >
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={(e) => onEditKeyDown(e, msg._id, editContent)}
                className={`w-full text-sm font-normal rounded-lg p-2 focus:outline-hidden focus:ring-1 focus:ring-indigo-400 resize-none ${
                  isMe
                    ? 'bg-indigo-700 text-white border-indigo-500/30 placeholder-white/50 focus:ring-white'
                    : 'bg-slate-100 dark:bg-neutral-800 text-slate-800 dark:text-neutral-200 border-slate-200 dark:border-neutral-750 focus:ring-indigo-500'
                }`}
                rows={1}
                autoFocus
              />
              <div className="flex justify-end gap-1.5 mt-2 text-[10px] select-none">
                <button
                  onClick={onCancelEdit}
                  className={`px-2 py-0.5 rounded transition-all font-semibold cursor-pointer ${
                    isMe
                      ? 'bg-indigo-700/60 hover:bg-indigo-700 text-indigo-150'
                      : 'bg-slate-200 dark:bg-neutral-800 hover:bg-slate-250 dark:hover:bg-neutral-755 text-slate-600 dark:text-neutral-300'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => onSaveEdit(msg._id, editContent)}
                  className={`px-2 py-0.5 rounded transition-all font-semibold cursor-pointer ${
                    isMe
                      ? 'bg-white text-indigo-600 hover:bg-slate-50'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  Save
                </button>
              </div>
            </div>
          ) : msg.image ? (
            <div
              className={`p-1.5 shadow-xs border ${roundedClasses} transition-shadow duration-200 hover:shadow-md max-w-[280px] sm:max-w-[360px] relative ${
                isMe
                  ? 'bg-indigo-600 border-indigo-650 text-white'
                  : 'bg-white dark:bg-neutral-900 text-slate-800 dark:text-neutral-200 border-slate-200 dark:border-neutral-800'
              }`}
            >
              {msg.replyTo && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    onReplyBadgeClick(msg.replyTo._id || msg.replyTo);
                  }}
                  className={`mb-1.5 rounded-lg p-2 text-[11px] flex flex-col border-l-3 cursor-pointer transition-all duration-200 ${
                    isMe
                      ? 'bg-indigo-700/50 border-indigo-300 hover:bg-indigo-750/70 text-indigo-100'
                      : 'bg-slate-100 dark:bg-neutral-955 border-indigo-500 hover:bg-slate-200/85 dark:hover:bg-neutral-900 text-slate-600 dark:text-neutral-350'
                  }`}
                >
                  <span className={`font-bold text-left ${isMe ? 'text-indigo-200' : 'text-indigo-650 dark:text-indigo-400'}`}>
                    {msg.replyTo.sender?.username || 'User'}
                  </span>
                  <span className="truncate text-left max-w-[180px] sm:max-w-[280px]">
                    {msg.replyTo.isDeleted ? (
                      <span className="italic flex items-center gap-1.5 opacity-60">
                        <Ban className="h-3.5 w-3.5" /> Deleted message
                      </span>
                    ) : (
                      msg.replyTo.content || (msg.replyTo.image ? '📷 Photo' : '')
                    )}
                  </span>
                </div>
              )}

              <div
                className="relative rounded-lg overflow-hidden bg-slate-100 dark:bg-neutral-950 flex items-center justify-center border border-slate-200/20"
                onClick={() => {
                  if (!msg.isOptimistic || msg.status !== 'uploading') {
                    onImageClick(msg.image);
                  }
                }}
                style={{
                  aspectRatio: (msg.imageWidth && msg.imageHeight) ? `${Number(msg.imageWidth)} / ${Number(msg.imageHeight)}` : 'auto',
                  maxHeight: '300px',
                  width: (msg.imageWidth && msg.imageHeight) ? `min(100%, ${(300 * Number(msg.imageWidth)) / Number(msg.imageHeight)}px)` : '100%',
                  maxWidth: '360px',
                  cursor: (msg.isOptimistic && msg.status === 'uploading') ? 'default' : 'zoom-in',
                }}
              >
                <img
                  src={msg.image}
                  alt="Sent attachment"
                  loading="lazy"
                  className={`max-h-[300px] w-full object-cover transition-opacity duration-300 ${
                    msg.isOptimistic && msg.status === 'uploading' ? 'opacity-40' : 'opacity-100'
                  }`}
                />

                {msg.isOptimistic && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/35 gap-2 text-white p-2">
                    {msg.status === 'uploading' ? (
                      <>
                        <Loader2 className="h-6 w-6 animate-spin text-white" />
                        <span className="text-[10px] font-bold tracking-wider">Uploading...</span>
                      </>
                    ) : msg.status === 'failed' ? (
                      <div className="flex flex-col items-center gap-2.5 p-2 bg-black/60 w-full h-full justify-center">
                        <span className="text-[11px] text-rose-450 font-extrabold flex items-center gap-1 bg-rose-950/80 px-3 py-1 rounded-full border border-rose-800/40 shadow-md">
                          ❌ Failed to send
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRetryClick(msg._id, msg.content, msg.retryData?.fileData);
                            }}
                            className="px-3 py-1.5 bg-white hover:bg-slate-100 active:scale-95 text-indigo-600 text-[10px] font-extrabold rounded-lg transition-all shadow-md cursor-pointer"
                          >
                            Retry
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteOptimistic(msg._id);
                            }}
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-[10px] font-extrabold rounded-lg transition-all shadow-md cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              {msg.content && msg.content.trim() && (
                <div className="px-2 pt-2.5 pb-1 break-words leading-relaxed text-sm whitespace-pre-wrap select-text font-normal text-left">
                  {renderMessageContent(msg.content, isMe)}
                </div>
              )}

              <div className="flex items-center justify-end gap-1.5 px-2 mt-1 select-none">
                {msg.isEdited && (
                  <span className={`text-[9px] font-bold opacity-75 ${isMe ? 'text-indigo-200/90' : 'text-slate-450 dark:text-slate-400'}`}>
                    Edited •
                  </span>
                )}
                <span className={`text-[9px] font-medium tracking-wide ${isMe ? 'text-indigo-200/90' : 'text-slate-450 dark:text-slate-400'}`}>
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
          ) : (
            <div
              className={`px-4 py-2.5 shadow-xs border ${roundedClasses} transition-shadow duration-200 hover:shadow-md ${
                isMe
                  ? 'bg-indigo-600 border-indigo-650 text-white'
                  : 'bg-white dark:bg-neutral-900 text-slate-800 dark:text-neutral-200 border-slate-200 dark:border-neutral-800'
              }`}
            >
              {msg.replyTo && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    onReplyBadgeClick(msg.replyTo._id || msg.replyTo);
                  }}
                  className={`mb-2 rounded-lg p-2 text-[11px] flex flex-col border-l-3 cursor-pointer transition-all duration-200 ${
                    isMe
                      ? 'bg-indigo-700/50 border-indigo-300 hover:bg-indigo-750/70 text-indigo-100'
                      : 'bg-slate-100 dark:bg-neutral-955 border-indigo-500 hover:bg-slate-200/85 dark:hover:bg-neutral-900 text-slate-600 dark:text-neutral-350'
                  }`}
                >
                  <span className={`font-bold text-left ${isMe ? 'text-indigo-200' : 'text-indigo-650 dark:text-indigo-400'}`}>
                    {msg.replyTo.sender?.username || 'User'}
                  </span>
                  <span className="truncate text-left max-w-[200px] sm:max-w-[400px]">
                    {msg.replyTo.isDeleted ? (
                      <span className="italic flex items-center gap-1.5 opacity-60">
                        <Ban className="h-3.5 w-3.5" /> Deleted message
                      </span>
                    ) : (
                      msg.replyTo.content || (msg.replyTo.image ? '📷 Photo' : '')
                    )}
                  </span>
                </div>
              )}
              <div className="break-words leading-relaxed text-sm whitespace-pre-wrap select-text font-normal">
                {renderMessageContent(msg.content, isMe)}
              </div>

              {/* Timestamp & Status Icon */}
              <div className="flex items-center justify-end gap-1.5 mt-1 select-none">
                {msg.isEdited && (
                  <span className={`text-[9px] font-bold opacity-75 ${isMe ? 'text-indigo-200/90' : 'text-slate-450 dark:text-slate-400'}`}>
                    Edited •
                  </span>
                )}
                <span className={`text-[9px] font-medium tracking-wide ${isMe ? 'text-indigo-200/90' : 'text-slate-455'}`}>
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
          )}
        </div>
      </div>

      {/* Reaction Badges */}
      {messageReactions.length > 0 && !msg.isDeleted && (
        <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'} ${!isMe ? 'pl-11' : ''} animate-in zoom-in-95 duration-200`}>
          {messageReactions.map((emoji) => (
            <button
              key={emoji}
              onClick={() => onReactionBadgeClick(msg._id, emoji)}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-neutral-300 transition-all duration-200 cursor-pointer hover:border-slate-350 dark:hover:border-neutral-700 hover:scale-110 active:scale-95 shadow-xs"
            >
              <span>{emoji}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

MessageBubble.displayName = 'MessageBubble';

const EMPTY_OBJECT = {};

export default function ChatContainer() {
  const messages = useChatStore((state) => state.messages);
  const selectedConversation = useChatStore((state) => state.selectedConversation);
  const isMessagesLoading = useChatStore((state) => state.isMessagesLoading);
  const editMessage = useChatStore((state) => state.editMessage);
  const deleteMessage = useChatStore((state) => state.deleteMessage);
  const setReplyingToMessage = useChatStore((state) => state.setReplyingToMessage);
  const retrySendMessage = useChatStore((state) => state.retrySendMessage);
  const authUser = useAuthStore((state) => state.authUser);

// 1. Get the current authenticated user's ID safely
const authUserId = useAuthStore((state) => state.authUser?._id);

// 2. Get the raw typing status object for this conversation
const typingStatusMap = useChatStore((state) => {
  const currentId = state.selectedConversation?._id;
  return currentId ? state.typingStatus[currentId] || EMPTY_OBJECT : EMPTY_OBJECT;
}, (oldMap, newMap) => {
  // Shallow compare the object keys/values so it only rerenders if typing status actually changes
  return Object.keys(oldMap).length === Object.keys(newMap).length &&
    Object.keys(oldMap).every(key => oldMap[key] === newMap[key]);
});

// 3. Compute the array purely in the component body (No infinite loops!)
const otherTypingUsers = Object.entries(typingStatusMap)
  .filter(([id]) => id !== authUserId)
  .map(([_, name]) => name);
  const scrollContainerRef = useRef(null);
  const [activeReactionId, setActiveReactionId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Fullscreen Image Viewer States
  const [viewerImageUrl, setViewerImageUrl] = useState(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);

  // Load reactions from local storage
  const [reactions, setReactions] = useState(() => {
    try {
      const saved = localStorage.getItem('chat_bubble_reactions');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Edit & Delete states
  const [contextMenu, setContextMenu] = useState(null); // { x, y, message }
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [deleteConfirmMessage, setDeleteConfirmMessage] = useState(null);

  // Touch handlers refs for Mobile long press
  const touchTimer = useRef(null);
  const isLongPress = useRef(false);

  const handleTouchStart = useCallback((e, msg) => {
    isLongPress.current = false;
    if (!e.touches || e.touches.length === 0) return;
    const touch = e.touches[0];
    const clientX = touch.clientX;
    const clientY = touch.clientY;

    touchTimer.current = setTimeout(() => {
      isLongPress.current = true;
      
      let x = clientX;
      let y = clientY;
      const menuWidth = 176;
      const menuHeight = 160;

      if (x + menuWidth > window.innerWidth) {
        x = window.innerWidth - menuWidth - 10;
      }
      if (y + menuHeight > window.innerHeight) {
        y = window.innerHeight - menuHeight - 10;
      }

      x = Math.max(10, x);
      y = Math.max(10, y);

      setContextMenu({ x, y, message: msg });
    }, 600);
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (touchTimer.current) {
      clearTimeout(touchTimer.current);
    }
    if (isLongPress.current) {
      e.preventDefault();
    }
  }, []);

  const handleTouchMove = useCallback(() => {
    if (touchTimer.current) {
      clearTimeout(touchTimer.current);
    }
  }, []);

  const handleContextMenu = useCallback((e, msg) => {
    if (msg.isDeleted) return;
    e.preventDefault();
    
    let x = e.clientX;
    let y = e.clientY;
    const menuWidth = 176;
    const menuHeight = 160;

    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 10;
    }
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 10;
    }

    x = Math.max(10, x);
    y = Math.max(10, y);

    setContextMenu({ x, y, message: msg });
  }, []);

  const scrollToMessage = useCallback((msgId) => {
    const element = document.getElementById(`msg-${msgId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('highlight-message');
      setTimeout(() => {
        element.classList.remove('highlight-message');
      }, 1500);
    } else {
      useToastStore.getState().addToast('Original message not found', 'error');
    }
  }, []);

  const handleSaveEdit = useCallback(async (messageId, currentContent) => {
    const trimmed = currentContent.trim();
    if (!trimmed) {
      useToastStore.getState().addToast('Message content cannot be empty', 'error');
      return;
    }

    try {
      await editMessage(messageId, trimmed);
      setEditingMessageId(null);
      setEditContent('');
    } catch (error) {
      // Error handled by store toast
    }
  }, [editMessage]);

  const cancelEdit = useCallback(() => {
    setEditingMessageId(null);
    setEditContent('');
  }, []);

  const handleEditKeyDown = useCallback((e, messageId, currentContent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit(messageId, currentContent);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  }, [handleSaveEdit, cancelEdit]);

  const handleDeleteMessage = useCallback(async (messageId, deleteType) => {
    try {
      await deleteMessage(messageId, deleteType);
      setDeleteConfirmMessage(null);
    } catch (error) {
      // Error handled by store toast
    }
  }, [deleteMessage]);

  // Advanced Viewer Handlers
  const handleViewerDoubleClick = useCallback((e) => {
    e.stopPropagation();
    if (zoomScale > 1) {
      setZoomScale(1);
      setOffsetX(0);
      setOffsetY(0);
    } else {
      setZoomScale(2.5);
    }
  }, [zoomScale]);

  const handleViewerWheel = useCallback((e) => {
    e.stopPropagation();
    setZoomScale((prevScale) => {
      const delta = e.deltaY * -0.015;
      const newScale = Math.min(Math.max(prevScale + delta, 1), 6);
      if (newScale === 1) {
        setOffsetX(0);
        setOffsetY(0);
      }
      return newScale;
    });
  }, []);

  const handleViewerMouseDown = useCallback((e) => {
    if (zoomScale <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    setStartX(e.clientX - offsetX);
    setStartY(e.clientY - offsetY);
  }, [zoomScale, offsetX, offsetY]);

  const handleViewerMouseMove = useCallback((e) => {
    if (!isDragging || zoomScale <= 1) return;
    e.preventDefault();
    setOffsetX(e.clientX - startX);
    setOffsetY(e.clientY - startY);
  }, [isDragging, zoomScale, startX, startY]);

  const handleViewerMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleImageClick = useCallback((url) => {
    setViewerImageUrl(url);
    setZoomScale(1);
    setOffsetX(0);
    setOffsetY(0);
  }, []);

  const handleRetryClick = useCallback(async (tempId, content, fileData) => {
    try {
      await retrySendMessage(tempId, content, fileData);
    } catch (err) {
      // handled by store
    }
  }, [retrySendMessage]);

  const handleDeleteOptimistic = useCallback(async (tempId) => {
    try {
      await deleteMessage(tempId, 'me');
    } catch (error) {
      // handled by store
    }
  }, [deleteMessage]);

  useEffect(() => {
    if (viewerImageUrl) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [viewerImageUrl]);

  useEffect(() => {
    if (!viewerImageUrl) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setViewerImageUrl(null);
        setZoomScale(1);
        setOffsetX(0);
        setOffsetY(0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewerImageUrl]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);

  const handleCopy = useCallback((text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }, []);

  const toggleReaction = useCallback((messageId, emoji) => {
    setReactions((prev) => {
      const msgReactions = prev[messageId] || [];
      const updated = msgReactions.includes(emoji)
        ? msgReactions.filter((e) => e !== emoji)
        : [...msgReactions, emoji];

      const next = { ...prev, [messageId]: updated };
      localStorage.setItem('chat_bubble_reactions', JSON.stringify(next));
      return next;
    });
  }, []);

  const handleSmileClick = useCallback((msgId) => {
    setActiveReactionId((prev) => (prev === msgId ? null : msgId));
  }, []);

  const isReadByRecipient = useCallback((msg) => {
    if (!selectedConversation || !authUser) return false;
    const authUserIdStr = String(authUser._id);
    if (selectedConversation.isGroup) {
      return msg.readBy.some((id) => {
        const idStr = String(typeof id === 'object' ? id?._id : id);
        return idStr !== authUserIdStr;
      });
    }
    if (!selectedConversation.participants) return false;
    const recipient = selectedConversation.participants.find((p) => {
      const pId = typeof p === 'object' ? p?._id : p;
      return String(pId) !== authUserIdStr;
    });
    if (!recipient) return false;
    const recipientIdStr = String(recipient._id || recipient);
    return msg.readBy.some((id) => {
      const idStr = String(typeof id === 'object' ? id?._id : id);
      return idStr === recipientIdStr;
    });
  }, [selectedConversation, authUser]);

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
            const isMe = getSenderId(msg.sender) === String(authUser?._id);
            const read = isReadByRecipient(msg);
            const isFirst = msg.isFirstInGroup;
            const isLast = msg.isLastInGroup;

            const username = getSenderUsername(msg.sender);
            const avatar = getSenderAvatar(msg.sender);

            return (
              <MessageBubble
                key={msg._id}
                msg={msg}
                isMe={isMe}
                read={read}
                isFirst={isFirst}
                isLast={isLast}
                isGroup={selectedConversation?.isGroup}
                username={username}
                avatar={avatar}
                isReactionSelectorOpen={activeReactionId === msg._id}
                isCopied={copiedId === msg._id}
                isEditing={editingMessageId === msg._id}
                editContent={editContent}
                setEditContent={setEditContent}
                messageReactions={reactions[msg._id] || []}
                onContextMenu={handleContextMenu}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchMove}
                onSmileClick={handleSmileClick}
                onCopyClick={handleCopy}
                onEmojiSelect={toggleReaction}
                onReactionBadgeClick={toggleReaction}
                onCancelEdit={cancelEdit}
                onSaveEdit={handleSaveEdit}
                onEditKeyDown={handleEditKeyDown}
                onReplyBadgeClick={scrollToMessage}
                onImageClick={handleImageClick}
                onRetryClick={handleRetryClick}
                onDeleteOptimistic={handleDeleteOptimistic}
              />
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
              src={getTypingUserAvatar(otherTypingUsers[0], selectedConversation)}
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

      {/* Context Menu Popup */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40 bg-transparent"
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu(null);
            }}
          />
          <div
            className="fixed z-50 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-xl rounded-xl py-1.5 w-44 animate-in zoom-in-95 duration-100"
            style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          >
            <button
              onClick={() => {
                setReplyingToMessage(contextMenu.message);
                setContextMenu(null);
              }}
              className="w-full text-left px-4 py-2 text-xs flex items-center gap-2 text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer font-medium"
            >
              <Reply className="h-4 w-4" />
              Reply
            </button>

            {/* Show Edit / Delete only if current user is sender */}
            {getSenderId(contextMenu.message.sender) === authUser?._id && (
              <>
                <button
                  onClick={() => {
                    const msg = contextMenu.message;
                    const isEditable = (Date.now() - new Date(msg.createdAt).getTime() < 15 * 60 * 1000);
                    if (!isEditable) {
                      useToastStore.getState().addToast('Messages can only be edited within 15 minutes of sending', 'error');
                      setContextMenu(null);
                      return;
                    }
                    setEditingMessageId(msg._id);
                    setEditContent(msg.content);
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-4 py-2 text-xs flex items-center gap-2 text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer font-medium"
                >
                  <Edit3 className="h-4 w-4" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    setDeleteConfirmMessage(contextMenu.message);
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-4 py-2 text-xs flex items-center gap-2 text-rose-600 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer font-medium"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </>
            )}

            <button
              onClick={() => {
                handleCopy(contextMenu.message.content, contextMenu.message._id);
                setContextMenu(null);
              }}
              className="w-full text-left px-4 py-2 text-xs flex items-center gap-2 text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer font-medium"
            >
              <Copy className="h-4 w-4" />
              Copy
            </button>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-slate-800 dark:text-neutral-200 mb-2">Delete message?</h3>
            <p className="text-xs text-slate-500 dark:text-neutral-400 mb-5 leading-normal">
              Would you like to delete this message for yourself, or delete it for everyone?
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleDeleteMessage(deleteConfirmMessage._id, 'everyone')}
                className="w-full py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-semibold text-xs transition-all duration-150 cursor-pointer"
              >
                Delete for Everyone
              </button>
              <button
                onClick={() => handleDeleteMessage(deleteConfirmMessage._id, 'me')}
                className="w-full py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-neutral-850 dark:hover:bg-neutral-800 active:scale-98 text-slate-800 dark:text-neutral-200 font-semibold text-xs transition-all duration-150 cursor-pointer"
              >
                Delete for Me
              </button>
              <button
                onClick={() => setDeleteConfirmMessage(null)}
                className="w-full py-2 px-4 rounded-xl border border-slate-200 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-850 active:scale-98 text-slate-500 dark:text-neutral-400 font-semibold text-xs transition-all duration-150 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Image Viewer Modal with advanced gesture controls */}
      {viewerImageUrl && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-xs select-none animate-in fade-in duration-200"
          onClick={() => {
            setViewerImageUrl(null);
            setZoomScale(1);
            setOffsetX(0);
            setOffsetY(0);
          }}
        >
          {/* Top Bar */}
          <div
            className="absolute top-0 inset-x-0 h-[calc(4rem+env(safe-area-inset-top))] flex items-center justify-between px-6 pt-[env(safe-area-inset-top)] bg-gradient-to-b from-black/60 to-transparent z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-white/80 text-xs font-semibold truncate max-w-[70%]">
              {viewerImageUrl.split('/').pop()}
            </span>
            <div className="flex items-center gap-3">
              {/* Download button */}
              <button
                onClick={async () => {
                  try {
                    const response = await fetch(viewerImageUrl);
                    const blob = await response.blob();
                    const blobUrl = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = blobUrl;
                    link.download = `charcha_${Date.now()}.${blob.type.split('/')[1] || 'jpg'}`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(blobUrl);
                  } catch (err) {
                    window.open(viewerImageUrl, '_blank');
                  }
                }}
                className="p-2 cursor-pointer rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white/90 hover:text-white transition-all"
                title="Download Image"
              >
                <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </button>

              {/* Close Button */}
              <button
                onClick={() => {
                  setViewerImageUrl(null);
                  setZoomScale(1);
                  setOffsetX(0);
                  setOffsetY(0);
                }}
                className="p-2 cursor-pointer rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white/90 hover:text-white transition-all"
                title="Close Viewer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>

          {/* Centered Image Container */}
          <div className="flex-1 flex items-center justify-center p-4">
            <img
              src={viewerImageUrl}
              alt="Fullscreen"
              onDoubleClick={handleViewerDoubleClick}
              onWheel={handleViewerWheel}
              onMouseDown={handleViewerMouseDown}
              onMouseMove={handleViewerMouseMove}
              onMouseUp={handleViewerMouseUp}
              onMouseLeave={handleViewerMouseUp}
              onClick={(e) => e.stopPropagation()}
              style={{
                transform: `translate(${offsetX}px, ${offsetY}px) scale(${zoomScale})`,
                cursor: zoomScale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
                transition: isDragging ? 'none' : 'transform 0.15s ease-out',
              }}
              className="max-h-[85vh] max-w-[90vw] object-contain select-none shadow-2xl rounded-xs"
            />
          </div>
        </div>
      )}
    </div>
  );
}
