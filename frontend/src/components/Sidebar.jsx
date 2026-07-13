import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { useChatStore } from '../stores/useChatStore';
import { useToastStore } from '../stores/useToastStore';
import { axiosInstance } from '../lib/axios';
import GroupModal from './GroupModal';
import ThemeToggle from './ThemeToggle';
import { SidebarSkeleton } from './Skeleton';
import { Search, LogOut, MessageSquare, Loader2, Plus, MessageCircle } from 'lucide-react';

export default function Sidebar() {
  const { authUser, logout, onlineUsers } = useAuthStore();
  const {
    conversations,
    getConversations,
    selectedConversation,
    setSelectedConversation,
    isConversationsLoading,
    startConversation,
    unreadCounts,
  } = useChatStore();

  const { addToast } = useToastStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getConversations();
  }, [getConversations]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await axiosInstance.get(`/users/search?query=${searchQuery}`);
      setSearchResults(res.data);
    } catch (error) {
      console.log('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectUser = async (user) => {
    const newConv = await startConversation({ userId: user._id, isGroup: false });
    if (newConv) {
      setSelectedConversation(newConv);
      setSearchQuery('');
      setSearchResults([]);
      addToast(`Chat started with ${user.username}`, 'success');
    }
  };

  const handleLogout = async () => {
    const res = await logout();
    if (res.success) {
      addToast('Logged out successfully', 'success');
    } else {
      addToast(res.error || 'Logout failed', 'error');
    }
  };

  // Helper function to highlight matching query text
  const highlightText = (text, query) => {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <span key={i} className="search-highlight">{part}</span>
      ) : (
        part
      )
    );
  };

  if (isConversationsLoading && conversations.length === 0) {
    return <SidebarSkeleton />;
  }

  return (
    <div className="flex h-full w-full flex-col bg-white dark:bg-black text-slate-800 dark:text-slate-100 select-none md:w-80 md:border-r border-slate-200/80 dark:border-neutral-900 animate-page-entrance">
      {/* Top Profile Header */}
      <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-neutral-900 bg-slate-50/50 dark:bg-neutral-950/40 p-4">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/profile')}>
          <div className="relative">
            <img
              src={authUser.avatar || `https://api.dicebear.com/8.x/adventurer/svg?seed=${authUser.username}`}
              alt={authUser.username}
              className="h-10 w-10 rounded-xl border border-indigo-500/35 object-cover transition-all duration-300 group-hover:scale-105 group-hover:shadow-md"
            />
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-neutral-950 animate-pulse-glow" />
          </div>
          <div className="text-left">
            <h2 className="font-bold text-slate-800 dark:text-slate-100 text-sm tracking-wide truncate max-w-[125px] transition-colors group-hover:text-indigo-500">{authUser.username}</h2>
            <p className="text-[10px] text-indigo-500 dark:text-indigo-400 font-bold uppercase tracking-wider">My Profile</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setIsGroupModalOpen(true)}
            className="cursor-pointer rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-100 dark:bg-neutral-900 p-2.5 text-indigo-600 dark:text-indigo-400 transition-all duration-200 hover:scale-105 hover:bg-slate-250 dark:hover:bg-neutral-800 active:scale-95 shadow-xs"
            title="Create New Group"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* User Search Panel */}
      <div className="border-b border-slate-200/80 dark:border-neutral-900 bg-slate-50/30 dark:bg-neutral-900/30 p-3">
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (!e.target.value.trim()) setSearchResults([]);
            }}
            className="w-full rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950 py-2.5 pl-9 pr-12 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-450 dark:placeholder-slate-650 transition-all duration-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/20"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSearchResults([]);
              }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer text-xs font-bold text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Main Conversation List / Search Results */}
      <div className="flex-1 overflow-y-auto">
        {searchQuery.trim() ? (
          /* Search Results */
          <div className="p-2 space-y-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <h3 className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Search Results</h3>
            {isSearching ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((user) => (
                <button
                  key={user._id}
                  onClick={() => handleSelectUser(user)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-neutral-900/60 text-left transition-all duration-200 cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-neutral-800/60"
                >
                  <img
                    src={user.avatar || `https://api.dicebear.com/8.x/adventurer/svg?seed=${user.username}`}
                    alt={user.username}
                    className="h-10 w-10 rounded-xl object-cover border border-slate-200 dark:border-neutral-800"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm truncate">
                      {highlightText(user.username, searchQuery)}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-450 truncate">
                      {highlightText(user.email, searchQuery)}
                    </p>
                  </div>
                </button>
              ))
            ) : (
              <p className="text-center py-6 text-xs text-slate-500">No users match query</p>
            )}
          </div>
        ) : (
          /* Active Conversations */
          <div className="p-2 space-y-1">
            <h3 className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-500/80 dark:text-indigo-400/80 flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" /> Chats
            </h3>

            {conversations.length > 0 ? (
              conversations.map((conv) => {
                const isSelected = selectedConversation?._id === conv._id;

                let recipient = null;
                if (!conv.isGroup) {
                  recipient = conv.participants.find((p) => p._id !== authUser._id);
                }

                const chatName = conv.isGroup ? conv.groupName : recipient?.username || 'Unknown Chat';
                const chatAvatar = conv.isGroup
                  ? `https://api.dicebear.com/8.x/initials/svg?seed=${conv.groupName}`
                  : recipient?.avatar || `https://api.dicebear.com/8.x/adventurer/svg?seed=${chatName}`;

                const isOnline = !conv.isGroup && recipient && onlineUsers.includes(recipient._id);

                const latestMsg = conv.latestMessage;
                let messagePreview = 'No messages yet';
                const getSenderId = (sender) => {
                  if (!sender) return null;
                  return typeof sender === 'object' ? sender._id : sender;
                };
                if (latestMsg) {
                  const prefix = getSenderId(latestMsg.sender) === authUser._id ? 'You: ' : '';
                  messagePreview = `${prefix}${latestMsg.content}`;
                }

                const isUnread =
                  latestMsg &&
                  getSenderId(latestMsg.sender) !== authUser._id &&
                  !latestMsg.readBy.includes(authUser._id);

                const unreadCount = unreadCounts[conv._id] || 0;

                return (
                  <button
                    key={conv._id}
                    onClick={() => setSelectedConversation(conv)}
                    className={`w-full flex items-center gap-3 p-3 transition-all-200 cursor-pointer border-l-4 rounded-xl ${
                      isSelected
                        ? 'bg-slate-100 dark:bg-neutral-900 border-indigo-500 text-indigo-600 dark:text-white font-medium'
                        : 'border-transparent text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-neutral-900/30 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <img src={chatAvatar} alt={chatName} className="h-10 w-10 rounded-xl object-cover border border-slate-200 dark:border-neutral-800/40" />
                      {isOnline && (
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white dark:border-neutral-950 animate-pulse-glow" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between">
                        <h4 className={`text-sm truncate ${isSelected ? 'font-bold text-slate-900 dark:text-white' : 'font-semibold text-slate-850 dark:text-slate-250'}`}>
                          {chatName}
                        </h4>
                        {unreadCount > 0 && !isSelected && (
                          <span className="flex items-center justify-center h-5 min-w-[20px] rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white shrink-0 animate-in zoom-in duration-200">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                      <p className={`text-xs truncate mt-0.5 ${isSelected ? 'text-indigo-600 dark:text-indigo-300' : isUnread ? 'text-slate-900 dark:text-slate-100 font-bold' : 'text-slate-400 dark:text-slate-450'}`}>
                        {messagePreview}
                      </p>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="text-center py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                <MessageCircle className="h-9 w-9 stroke-1 text-slate-400 animate-float" />
                <p className="text-xs font-semibold">No conversations yet.<br />Search for someone to start chatting.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Logout Options */}
      <div className="flex items-center justify-between border-t border-slate-200/80 dark:border-neutral-900 bg-slate-50/20 dark:bg-neutral-950/20 p-3">
        <button
          onClick={handleLogout}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl p-2.5 text-xs font-bold text-rose-500 dark:text-rose-400 transition-all duration-200 hover:scale-105 hover:bg-rose-500/10 active:scale-95"
        >
          <LogOut className="h-4 w-4" />
          Log Out
        </button>
      </div>

      <GroupModal isOpen={isGroupModalOpen} onClose={() => setIsGroupModalOpen(false)} />
    </div>
  );
}

