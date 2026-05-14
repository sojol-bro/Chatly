import React, { useState, useEffect } from 'react';
import { Search, MoreVertical, UserPlus, X, Loader2 } from 'lucide-react';
import axios from 'axios';
import useStore from '../store/useStore';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...inputs) => twMerge(clsx(inputs));
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const ChatSidebar = () => {
  const { conversations, currentConversationId, setCurrentConversation, user, token, setConversations } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(false);

  // Debounced user search
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        setIsSearching(true);
        setLoading(true);
        try {
          const res = await axios.get(`${API_BASE}/users/search/?q=${searchQuery}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setSearchResults(res.data);
        } catch (err) {
          console.error('Search failed', err);
        } finally {
          setLoading(false);
        }
      } else {
        setIsSearching(false);
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, token]);

  const startNewChat = async (targetUsername) => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/conversations/start/`, 
        { username: targetUsername },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update local conversations list if it's a new one
      if (!conversations.find(c => c.id === res.data.id)) {
        setConversations([res.data, ...conversations]);
      }
      
      setCurrentConversation(res.data.id);
      setSearchQuery('');
      setIsSearching(false);
    } catch (err) {
      console.error('Failed to start chat', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-80 border-r bg-white z-20">
      {/* Sidebar Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-stitch flex items-center justify-center text-white font-bold shadow-lg shadow-stitch/20">
            {user?.username?.[0]?.toUpperCase() || 'S'}
          </div>
          <h1 className="text-xl font-bold text-gray-800 tracking-tight">Stitch</h1>
        </div>
        <button className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
          <MoreVertical size={20} />
        </button>
      </div>

      {/* Search Bar */}
      <div className="px-4 mb-4 relative">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-stitch transition-colors" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search people by username..."
            className="w-full bg-gray-100 border-none rounded-2xl py-2.5 pl-10 pr-10 focus:ring-2 focus:ring-stitch outline-none text-sm transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {isSearching && (
          <div className="absolute top-full left-4 right-4 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 max-h-60 overflow-y-auto">
            <div className="p-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 py-2">People</p>
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="animate-spin text-stitch" size={20} />
                </div>
              ) : searchResults.length === 0 ? (
                <p className="text-xs text-gray-500 p-3 text-center">No users found</p>
              ) : (
                searchResults.map(u => (
                  <div
                    key={u.id}
                    onClick={() => startNewChat(u.username)}
                    className="flex items-center justify-between p-2 hover:bg-stitch/5 rounded-xl cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-xs">
                        {u.username[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-gray-700">{u.username}</span>
                    </div>
                    <UserPlus size={16} className="text-gray-300 group-hover:text-stitch transition-colors" />
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-2">
        {conversations.length === 0 && !isSearching ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Search className="text-gray-300" size={24} />
            </div>
            <p className="text-sm text-gray-400">Search a username to start chatting</p>
          </div>
        ) : (
          conversations.map((conv) => {
            const otherParticipant = conv.participants.find(p => p.id !== user?.id);
            const isActive = currentConversationId === conv.id;
            
            return (
              <div
                key={conv.id}
                onClick={() => setCurrentConversation(conv.id)}
                className={cn(
                  "px-4 py-3 flex items-center gap-3 cursor-pointer transition-all rounded-2xl mb-1",
                  isActive ? "bg-stitch text-white shadow-lg shadow-stitch/30" : "hover:bg-gray-50"
                )}
              >
                <div className="relative">
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm overflow-hidden border-2",
                    isActive ? "bg-white/20 border-white/40" : "bg-gray-100 text-gray-500 border-white shadow-sm"
                  )}>
                    {otherParticipant?.username?.[0]?.toUpperCase() || '?'}
                  </div>
                  {!isActive && <div className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-0.5">
                    <h3 className="font-bold truncate text-sm">
                      {otherParticipant?.username || 'Unknown User'}
                    </h3>
                    <span className={cn(
                      "text-[10px] whitespace-nowrap pt-1",
                      isActive ? "text-white/60" : "text-gray-400"
                    )}>
                      {conv.created_at ? new Date(conv.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                  <p className={cn(
                    "text-xs truncate opacity-80",
                    isActive ? "text-white" : "text-gray-500"
                  )}>
                    {conv.last_message || 'Start a conversation...'}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ChatSidebar;

