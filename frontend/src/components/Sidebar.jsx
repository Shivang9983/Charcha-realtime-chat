import { useEffect, useState, memo, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { useChatStore } from '../stores/useChatStore';
import { useToastStore } from '../stores/useToastStore';
import { axiosInstance } from '../lib/axios';
import GroupModal from './GroupModal';
import ThemeToggle from './ThemeToggle';
import SidebarFooter from './SidebarFooter';
import { SidebarSkeleton } from './Skeleton';
import { MessageSquare, Loader2, Plus, MessageCircle } from 'lucide-react';
import SearchBar from './SearchBar';

const SidebarConversationItem = memo(({
  conv,
  isSelected,
  isOnline,
  unreadCount,
  authUser
}) => {
  const [_, setSearchParams] = useSearchParams();
  const authUserIdStr = String(authUser?._id);
  let recipient = null;
  if (!conv.isGroup && conv.participants) {
    recipient = conv.participants.find((p) => {
      const pId = typeof p === 'object' ? p?._id : p;
      return String(pId) !== authUserIdStr;
    });
  }

  const chatName = conv.isGroup ? conv.groupName : recipient?.username || 'Unknown Chat';
  const chatAvatar = conv.isGroup
    ? `https://api.dicebear.com/8.x/initials/svg?seed=${conv.groupName}`
    : recipient?.avatar || `https://api.dicebear.com/8.x/adventurer/svg?seed=${chatName}`;

  const latestMsg = conv.latestMessage;
  let messagePreview = 'No messages yet';
  const getSenderId = (sender) => {
    if (!sender) return null;
    const sId = typeof sender === 'object' ? sender._id : sender;
    return sId ? String(sId) : null;
  };
  if (latestMsg) {
    const prefix = getSenderId(latestMsg.sender) === authUserIdStr ? 'You: ' : '';
    const content = latestMsg.content || (latestMsg.image ? '📷 Photo' : '');
    messagePreview = `${prefix}${content}`;
  }

  const isUnread =
    latestMsg &&
    getSenderId(latestMsg.sender) !== authUserIdStr &&
    !latestMsg.readBy.some((id) => String(typeof id === 'object' ? id?._id : id) === authUserIdStr);

  return (
    <button
      onClick={() => setSearchParams({ chat: conv._id })}
      className={`w-full flex items-center gap-3 p-3 transition-all duration-200 cursor-pointer border-l-4 rounded-xl ${
        isSelected
          ? 'bg-slate-100 dark:bg-neutral-900 border-indigo-500 text-indigo-600 dark:text-white font-medium'
          : 'border-transparent text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-neutral-900/30 hover:text-slate-800 dark:hover:text-slate-200'
      }`}
    >
      <div className="relative flex-shrink-0">
        <img src={chatAvatar} alt={chatName} className="h-10 w-10 rounded-xl object-cover border border-slate-200 dark:border-neutral-800/40" />
        {isOnline && (
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white dark:border-neutral-955 animate-pulse-glow" />
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
        <p className={`text-xs truncate mt-0.5 ${isSelected ? 'text-indigo-600 dark:text-indigo-300' : isUnread ? 'text-slate-900 dark:text-slate-100 font-bold' : 'text-slate-400 dark:text-slate-455'}`}>
          {messagePreview}
        </p>
      </div>
    </button>
  );
});

SidebarConversationItem.displayName = 'SidebarConversationItem';

const SidebarOnlineUserItem = memo(({ user, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 transition-all duration-200 cursor-pointer border-l-4 border-transparent rounded-xl text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-neutral-900/30 hover:text-slate-800 dark:hover:text-slate-200"
    >
      <div className="relative flex-shrink-0">
        <img
          src={user.avatar || `https://api.dicebear.com/8.x/adventurer/svg?seed=${user.username}`}
          alt={user.username}
          className="h-10 w-10 rounded-xl object-cover border border-slate-200 dark:border-neutral-800/40"
        />
        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white dark:border-neutral-955 animate-pulse-glow" />
      </div>
      <div className="flex-1 min-w-0 text-left">
        <h4 className="text-sm font-semibold text-slate-850 dark:text-slate-250 truncate">
          {user.username}
        </h4>
        <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">
          Active Now
        </p>
      </div>
    </button>
  );
});

SidebarOnlineUserItem.displayName = 'SidebarOnlineUserItem';

export default function Sidebar() {
  const authUser = useAuthStore((state) => state.authUser);
  const logout = useAuthStore((state) => state.logout);
  const onlineUsers = useAuthStore(
    (state) => state.onlineUsers,
    (a, b) => a.length === b.length && a.every((val, idx) => val === b[idx])
  );

  const conversations = useChatStore((state) => state.conversations);
  const getConversations = useChatStore((state) => state.getConversations);
  const selectedConversation = useChatStore((state) => state.selectedConversation);
  const isConversationsLoading = useChatStore((state) => state.isConversationsLoading);
  const [_, setSearchParams] = useSearchParams();
  const startConversation = useChatStore((state) => state.startConversation);
  const unreadCounts = useChatStore((state) => state.unreadCounts);
  const onlineUserProfiles = useChatStore((state) => state.onlineUserProfiles);

  const { addToast } = useToastStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getConversations();
  }, [getConversations]);

  // Trigger search when searchQuery changes (debounced from SearchBar)
  useEffect(() => {
    const triggerSearch = async () => {
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

    triggerSearch();
  }, [searchQuery]);

  const handleSelectOnlineUser = async (user) => {
    if (!user) return;
    const targetUserIdStr = String(user._id);
    
    // Check if conversation already exists in local list to avoid database calls
    const existingConv = conversations.find((c) => {
      if (c.isGroup || !c.participants) return false;
      return c.participants.some((p) => {
        const pId = typeof p === 'object' ? p?._id : p;
        return String(pId) === targetUserIdStr;
      });
    });

    if (existingConv) {
      setSearchParams({ chat: existingConv._id });
      setSearchQuery('');
      setSearchResults([]);
      return;
    }

    // Call API to start/get conversation if not already cached
    const newConv = await startConversation({ userId: user._id, isGroup: false });
    if (newConv) {
      setSearchParams({ chat: newConv._id });
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

  // Local Search Filtering calculations
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    const authUserIdStr = String(authUser?._id);

    return conversations.filter((conv) => {
      if (conv.isGroup) {
        return conv.groupName?.toLowerCase().includes(query);
      }
      if (!conv.participants) return false;
      const recipient = conv.participants.find((p) => {
        const pId = typeof p === 'object' ? p?._id : p;
        return String(pId) !== authUserIdStr;
      });
      return recipient?.username?.toLowerCase().includes(query);
    });
  }, [conversations, searchQuery, authUser]);

  const filteredOnlineUsers = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return (onlineUserProfiles || []).filter((user) =>
      user.username?.toLowerCase().includes(query)
    );
  }, [onlineUserProfiles, searchQuery]);

  if (isConversationsLoading && conversations.length === 0) {
    return <SidebarSkeleton />;
  }

  return (
    <div className="flex h-full w-full flex-col bg-white dark:bg-black text-slate-800 dark:text-slate-100 select-none md:w-80 md:border-r border-slate-200/80 dark:border-neutral-900 animate-page-entrance">
      {/* Top Profile Header */}
      <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-neutral-900 bg-transparent py-3.5 px-4 pt-[calc(0.875rem+env(safe-area-inset-top))] md:pt-3.5">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/profile')}>
          <div className="relative">
            <img
              src={authUser.avatar || `https://api.dicebear.com/8.x/adventurer/svg?seed=${authUser.username}`}
              alt={authUser.username}
              className="h-10 w-10 rounded-xl object-cover transition-all duration-300 avatar-ring-premium group-hover:scale-105"
            />
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white dark:border-black animate-pulse-glow" />
          </div>
          <div className="text-left">
            <h2 className="font-bold text-slate-900 dark:text-white text-sm tracking-wide truncate max-w-[125px] transition-colors duration-200 group-hover:text-indigo-650 dark:group-hover:text-indigo-400">{authUser.username}</h2>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest leading-none mt-1 group-hover:text-indigo-500/80 dark:group-hover:text-indigo-400/80 transition-colors duration-200">My Profile</p>
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
      <div className="border-b border-slate-200/80 dark:border-neutral-900 bg-transparent p-3">
        <SearchBar onChange={setSearchQuery} isSearching={isSearching} />
      </div>

      {/* Main Conversation List / Search Results */}
      <div className="flex-1 overflow-y-auto">
        {searchQuery.trim() ? (
          /* Search Results */
          <div className="p-2 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* Matching Conversations */}
            {filteredConversations.length > 0 && (
              <div className="space-y-1">
                <h3 className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-500/80">Chats</h3>
                {filteredConversations.map((conv) => {
                  const isSelected = selectedConversation?._id === conv._id;
                  let recipient = null;
                  const authUserIdStr = String(authUser?._id);
                  if (!conv.isGroup && conv.participants) {
                    recipient = conv.participants.find((p) => {
                      const pId = typeof p === 'object' ? p?._id : p;
                      return String(pId) !== authUserIdStr;
                    });
                  }
                  const isOnline = !conv.isGroup && recipient && onlineUsers.some((id) => String(id) === String(recipient._id || recipient));
                  const unreadCount = unreadCounts[conv._id] || 0;

                  return (
                    <SidebarConversationItem
                      key={conv._id}
                      conv={conv}
                      isSelected={isSelected}
                      isOnline={isOnline}
                      unreadCount={unreadCount}
                      authUser={authUser}
                    />
                  );
                })}
              </div>
            )}

            {/* Matching Online Users */}
            {filteredOnlineUsers.length > 0 && (
              <div className="space-y-1">
                <h3 className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-500/80">Online Users</h3>
                {filteredOnlineUsers.map((user) => (
                  <SidebarOnlineUserItem
                    key={user._id}
                    user={user}
                    onClick={() => handleSelectOnlineUser(user)}
                  />
                ))}
              </div>
            )}

            {/* Global/Database Search Results */}
            <div className="space-y-1">
              <h3 className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Directory Results</h3>
              {isSearching ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
                </div>
              ) : searchResults.length > 0 ? (
                searchResults
                  .filter(
                    (user) =>
                      !filteredOnlineUsers.some((ou) => String(ou._id) === String(user._id)) &&
                      !filteredConversations.some(
                        (c) => {
                          if (c.isGroup || !c.participants) return false;
                          return c.participants.some((p) => {
                            const pId = typeof p === 'object' ? p?._id : p;
                            return String(pId) === String(user._id);
                          });
                        }
                      )
                  )
                  .map((user) => (
                    <button
                      key={user._id}
                      onClick={() => handleSelectOnlineUser(user)}
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
                        <p className="text-xs text-slate-500 dark:text-slate-455 truncate">
                          {highlightText(user.email, searchQuery)}
                        </p>
                      </div>
                    </button>
                  ))
              ) : (
                <p className="text-center py-6 text-xs text-slate-500">No other users match query</p>
              )}
            </div>
          </div>
        ) : (
          /* Active Conversations & Online Users */
          <div className="p-2 space-y-6">
            {/* Chats section */}
            <div className="space-y-1">
              <h3 className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-500/80 dark:text-indigo-400/80 flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" /> Chats
              </h3>

              {conversations.length > 0 ? (
                conversations.map((conv) => {
                  const isSelected = selectedConversation?._id === conv._id;

                  let recipient = null;
                  const authUserIdStr = String(authUser?._id);
                  if (!conv.isGroup && conv.participants) {
                    recipient = conv.participants.find((p) => {
                      const pId = typeof p === 'object' ? p?._id : p;
                      return String(pId) !== authUserIdStr;
                    });
                  }

                  const isOnline = !conv.isGroup && recipient && onlineUsers.some((id) => String(id) === String(recipient._id || recipient));
                  const unreadCount = unreadCounts[conv._id] || 0;

                  return (
                    <SidebarConversationItem
                      key={conv._id}
                      conv={conv}
                      isSelected={isSelected}
                      isOnline={isOnline}
                      unreadCount={unreadCount}
                      authUser={authUser}
                    />
                  );
                })
              ) : (
                <div className="text-center py-8 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <MessageCircle className="h-9 w-9 stroke-1 text-slate-400 animate-float" />
                  <p className="text-xs font-semibold">No conversations yet.<br />Search for someone to start chatting.</p>
                </div>
              )}
            </div>

            {/* Online Users section */}
            <div className="space-y-1">
              <h3 className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-500/80 dark:text-emerald-400/80 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" /> Online Users ({onlineUserProfiles.length})
              </h3>

              {onlineUserProfiles.length > 0 ? (
                onlineUserProfiles.map((user) => (
                  <SidebarOnlineUserItem
                    key={user._id}
                    user={user}
                    onClick={() => handleSelectOnlineUser(user)}
                  />
                ))
              ) : (
                <div className="text-center py-6 text-xs text-slate-400 font-semibold leading-relaxed">
                  No other users online
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom User Footer Card */}
      <SidebarFooter handleLogout={handleLogout} />


      <GroupModal isOpen={isGroupModalOpen} onClose={() => setIsGroupModalOpen(false)} />
    </div>
  );
}
