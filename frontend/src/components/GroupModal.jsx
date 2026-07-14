import { useState } from 'react';
import { useChatStore } from '../stores/useChatStore';
import { useToastStore } from '../stores/useToastStore';
import { axiosInstance } from '../lib/axios';
import { GroupModalSkeleton } from './Skeleton';
import { X, Search, Check, Users, Loader2 } from 'lucide-react';

export default function GroupModal({ isOpen, onClose }) {
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const startConversation = useChatStore((state) => state.startConversation);
  const addToast = useToastStore((state) => state.addToast);

  if (!isOpen) return null;

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setError('');
    try {
      const res = await axiosInstance.get(`/users/search?query=${searchQuery}`);
      setSearchResults(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to search users');
      addToast(err.response?.data?.error || 'Failed to search users', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const toggleParticipant = (user) => {
    if (selectedParticipants.some((p) => p._id === user._id)) {
      setSelectedParticipants(selectedParticipants.filter((p) => p._id !== user._id));
    } else {
      setSelectedParticipants([...selectedParticipants, user]);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setError('Group name is required');
      return;
    }
    if (selectedParticipants.length === 0) {
      setError('Please select at least one participant');
      return;
    }

    setIsCreating(true);
    setError('');
    try {
      const participantIds = selectedParticipants.map((p) => p._id);
      const newConv = await startConversation({
        isGroup: true,
        groupName,
        participants: participantIds,
      });

      if (newConv) {
        onClose();
        setGroupName('');
        setSelectedParticipants([]);
        setSearchResults([]);
        setSearchQuery('');
        addToast(`Group "${groupName}" created successfully!`, 'success');
      } else {
        setError('Failed to create group');
        addToast('Failed to create group', 'error');
      }
    } catch {
      setError('Failed to create group');
      addToast('Failed to create group', 'error');
    } finally {
      setIsCreating(false);
    }
  };

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-slate-200 dark:border-neutral-900 bg-white dark:bg-neutral-950 text-slate-800 dark:text-slate-100 shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-neutral-900 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400">
              <Users className="h-5 w-5" />
            </div>
            <div className="text-left">
              <h2 className="font-bold text-base text-slate-800 dark:text-slate-100">Create Group Chat</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500">Start conversations with multiple people</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-neutral-900 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 text-xs rounded-xl bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/20 font-semibold animate-in fade-in duration-200">
              {error}
            </div>
          )}

          {/* Group Name input */}
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider">Group Name</label>
            <input
              type="text"
              placeholder="e.g. Project Team"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-650 transition-all duration-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/20"
            />
          </div>

          {/* Selected participants tags */}
          {selectedParticipants.length > 0 && (
            <div className="space-y-1.5 text-left animate-in fade-in duration-250">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider">
                Participants ({selectedParticipants.length})
              </label>
              <div className="flex max-h-24 flex-wrap gap-2 overflow-y-auto rounded-xl border border-slate-200 dark:border-neutral-900 bg-slate-50/50 dark:bg-neutral-950/50 p-2.5">
                {selectedParticipants.map((p) => (
                  <span
                    key={p._id}
                    onClick={() => toggleParticipant(p)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 border border-indigo-500/25 text-indigo-600 dark:text-indigo-300 rounded-full text-xs font-semibold cursor-pointer hover:bg-rose-500/10 hover:border-rose-500/25 hover:text-rose-500 transition-all"
                  >
                    {p.username}
                    <X className="h-3 w-3" />
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Search participants */}
          <div className="space-y-2 text-left">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider">Add People</label>
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search username or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950 py-2.5 pl-10 pr-4 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-650 transition-all duration-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/20"
                />
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all duration-200 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 flex items-center justify-center cursor-pointer shadow-xs shrink-0"
              >
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
              </button>
            </form>
          </div>

          {/* Search results list */}
          <div className="space-y-2">
            {isSearching ? (
              <GroupModalSkeleton />
            ) : searchResults.length > 0 ? (
              <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-neutral-900 divide-y divide-slate-150 dark:divide-neutral-900 shadow-xs">
                {searchResults.map((user) => {
                  const isSelected = selectedParticipants.some((p) => p._id === user._id);
                  return (
                    <div
                      key={user._id}
                      onClick={() => toggleParticipant(user)}
                      className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-neutral-900/40 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={user.avatar || `https://api.dicebear.com/8.x/adventurer/svg?seed=${user.username}`}
                          alt={user.username}
                          className="h-9 w-9 rounded-xl object-cover border border-slate-200 dark:border-neutral-800"
                        />
                        <div className="text-left">
                          <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">{highlightText(user.username, searchQuery)}</div>
                          <div className="text-xs text-slate-400 dark:text-slate-500">{highlightText(user.email, searchQuery)}</div>
                        </div>
                      </div>
                      <div className={`p-1 rounded-full border transition-all duration-200 ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-600 text-white hover:scale-110'
                          : 'border-slate-300 dark:border-neutral-800 text-transparent'
                      }`}>
                        <Check className="h-3 w-3" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : searchQuery && !isSearching ? (
              <div className="text-center py-6 text-xs text-slate-400">No users found</div>
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2.5 border-t border-slate-200/80 dark:border-neutral-900 bg-slate-50/40 dark:bg-neutral-950/20 p-4">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 dark:border-neutral-800 text-slate-500 dark:text-slate-400 rounded-xl text-xs font-bold hover:bg-slate-100 dark:hover:bg-neutral-900 hover:text-slate-800 dark:hover:text-slate-200 transition-all duration-250 cursor-pointer active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateGroup}
            disabled={isCreating || !groupName.trim() || selectedParticipants.length === 0}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all duration-250 hover:-translate-y-0.5 active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-sm hover:shadow-md"
          >
            {isCreating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Create Group
          </button>
        </div>
      </div>
    </div>
  );
}

