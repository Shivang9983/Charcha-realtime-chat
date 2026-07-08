import { useState } from 'react';
import { useChatStore } from '../stores/useChatStore';
import { axiosInstance } from '../lib/axios';
import { X, Search, Check, Users, Loader2 } from 'lucide-react';

export default function GroupModal({ isOpen, onClose }) {
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const { startConversation } = useChatStore();

  if (!isOpen) return null;

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setError('');
    try {
      const res = await axiosInstance.get(`/users/search?query=${searchQuery}`);
      setSearchResults(res.data);
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to search users');
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
      } else {
        setError('Failed to create group');
      }
    } catch {
      setError('Failed to create group');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-5">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-slate-100">Create Group Chat</h2>
              <p className="text-xs text-slate-400">Start conversations with multiple people</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 text-sm rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
              {error}
            </div>
          )}

          {/* Group Name input */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Group Name</label>
            <input
              type="text"
              placeholder="e.g. Project Team"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-slate-100 placeholder-slate-500 transition-colors focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Selected participants tags */}
          {selectedParticipants.length > 0 && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Participants ({selectedParticipants.length})
              </label>
              <div className="flex max-h-24 flex-wrap gap-2 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/50 p-2">
                {selectedParticipants.map((p) => (
                  <span
                    key={p._id}
                    onClick={() => toggleParticipant(p)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-500/15 border border-indigo-500/35 text-indigo-300 rounded-full text-xs font-medium cursor-pointer hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-300 transition-all"
                  >
                    {p.username}
                    <X className="h-3 w-3" />
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Search participants */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Add People</label>
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search username or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-10 pr-4 text-slate-100 placeholder-slate-500 transition-colors focus:border-indigo-500 focus:outline-none"
                />
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-all disabled:opacity-50 flex items-center justify-center cursor-pointer"
              >
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
              </button>
            </form>
          </div>

          {/* Search results list */}
          <div className="space-y-2">
            {searchResults.length > 0 ? (
              <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-800 divide-y divide-slate-800">
                {searchResults.map((user) => {
                  const isSelected = selectedParticipants.some((p) => p._id === user._id);
                  return (
                    <div
                      key={user._id}
                      onClick={() => toggleParticipant(user)}
                      className="flex items-center justify-between p-3 hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={user.avatar || `https://api.dicebear.com/8.x/adventurer/svg?seed=${user.username}`}
                          alt={user.username}
                          className="h-9 w-9 rounded-full object-cover border border-slate-700/50"
                        />
                        <div>
                          <div className="font-semibold text-slate-200 text-sm">{user.username}</div>
                          <div className="text-xs text-slate-500">{user.email}</div>
                        </div>
                      </div>
                      <div className={`p-1 rounded-full border transition-all ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'border-slate-700 text-transparent'
                      }`}>
                        <Check className="h-3 w-3" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : searchQuery && !isSearching ? (
              <div className="text-center py-6 text-sm text-slate-500">No users found</div>
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-slate-800 bg-slate-900/30 p-4">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-700 text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateGroup}
            disabled={isCreating || !groupName.trim() || selectedParticipants.length === 0}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 cursor-pointer"
          >
            {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Group
          </button>
        </div>
      </div>
    </div>
  );
}
