import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { useChatStore } from '../stores/useChatStore';
import { axiosInstance } from '../lib/axios';
import GroupModal from './GroupModal';
import ThemeToggle from './ThemeToggle';
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
  } = useChatStore();

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
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-white dark:bg-black text-slate-800 dark:text-slate-100 select-none md:w-80 md:border-r border-slate-200 dark:border-neutral-900">
      {/* Top Profile Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-900 bg-slate-50/50 dark:bg-neutral-950/40 p-4">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/profile')}>
          <img
            src={authUser.avatar || `https://api.dicebear.com/8.x/adventurer/svg?seed=${authUser.username}`}
            alt={authUser.username}
            className="h-10 w-10 rounded-xl border border-indigo-500/35 object-cover hover:scale-105 transition-all"
          />
          <div className="text-left">
            <h2 className="font-semibold text-slate-800 dark:text-slate-100 text-sm tracking-wide truncate max-w-[120px]">{authUser.username}</h2>
            <p className="text-xs text-indigo-500 dark:text-indigo-400 font-medium">My Profile</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <button
            onClick={() => setIsGroupModalOpen(true)}
            className="cursor-pointer rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-100 dark:bg-neutral-900 p-2.5 text-indigo-550 dark:text-indigo-400 transition-all hover:scale-105 hover:bg-slate-200 dark:hover:bg-neutral-850 active:scale-95"
            title="Create New Group"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* User Search Panel */}
      <div className="border-b border-slate-200 dark:border-neutral-900 bg-slate-50/30 dark:bg-neutral-900/30 p-3">
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (!e.target.value.trim()) setSearchResults([]);
            }}
            className="w-full rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950 py-2 pl-9 pr-8 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 transition-colors focus:border-indigo-650 focus:outline-none"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSearchResults([]);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-xs text-slate-450 hover:text-slate-600 dark:hover:text-slate-350"
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
          <div className="p-2 space-y-1">
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
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-800/40 text-left transition-colors cursor-pointer"
                >
                  <img
                    src={user.avatar || `https://api.dicebear.com/8.x/adventurer/svg?seed=${user.username}`}
                    alt={user.username}
                    className="h-10 w-10 rounded-full object-cover border border-slate-700/50"
                  />
                  <div>
                    <h4 className="font-semibold text-slate-200 text-sm">{user.username}</h4>
                    <p className="text-xs text-slate-500">{user.email}</p>
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
            <h3 className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-400/80 flex items-center gap-1.5">
              <MessageSquare className="h-3 w-3" /> Chats
            </h3>

            {isConversationsLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
              </div>
            ) : conversations.length > 0 ? (
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

                return (
                  <button
                    key={conv._id}
                    onClick={() => setSelectedConversation(conv)}
                    className={`w-full flex items-center gap-3 p-3 transition-all cursor-pointer border-l-4 ${
                      isSelected
                        ? 'bg-slate-100 dark:bg-neutral-900 border-indigo-500 text-slate-900 dark:text-slate-100 font-medium rounded-r-xl'
                        : 'border-transparent text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-neutral-900/30 rounded-xl hover:text-slate-850 dark:hover:text-slate-200'
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <img src={chatAvatar} alt={chatName} className="h-10 w-10 rounded-xl object-cover border border-slate-200 dark:border-neutral-800/40" />
                      {isOnline && (
                        <>
                          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white dark:border-neutral-950" />
                          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 animate-pulse-ring border-2 border-white dark:border-neutral-950" />
                        </>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className={`text-sm truncate ${isSelected ? 'font-bold text-slate-900 dark:text-white' : 'font-semibold text-slate-800 dark:text-slate-200'}`}>
                          {chatName}
                        </h4>
                        {isUnread && !isSelected && (
                          <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 animate-pulse" />
                        )}
                      </div>
                      <p className={`text-xs truncate mt-0.5 ${isSelected ? 'text-indigo-600 dark:text-indigo-300' : isUnread ? 'text-slate-900 dark:text-slate-100 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>
                        {messagePreview}
                      </p>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="text-center py-10 flex flex-col items-center justify-center gap-3 text-slate-400">
                <MessageCircle className="h-8 w-8 stroke-1 text-slate-400" />
                <p className="text-xs">No conversations yet.<br />Search for someone to start chatting.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Logout Options */}
      <div className="flex items-center justify-between border-t border-slate-200 dark:border-neutral-900 bg-slate-50/20 dark:bg-neutral-950/20 p-3">
        <button
          onClick={() => logout()}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl p-2.5 text-xs font-semibold text-rose-400 transition-all hover:scale-105 hover:bg-rose-500/10 hover:text-rose-300 active:scale-95"
        >
          <LogOut className="h-4 w-4" />
          Log Out
        </button>
      </div>

      <GroupModal isOpen={isGroupModalOpen} onClose={() => setIsGroupModalOpen(false)} />
    </div>
  );
}
