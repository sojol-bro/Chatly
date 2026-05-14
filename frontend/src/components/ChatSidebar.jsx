import React from 'react';
import { Search, MoreVertical } from 'lucide-react';
import useStore from '../store/useStore';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...inputs) => twMerge(clsx(inputs));

const ChatSidebar = () => {
  const { conversations, currentConversationId, setCurrentConversation, user } = useStore();

  return (
    <div className="flex flex-col h-full w-80 border-r bg-white">
      {/* Sidebar Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-stitch flex items-center justify-center text-white font-bold">
            {user?.username?.[0]?.toUpperCase() || 'S'}
          </div>
          <h1 className="text-xl font-bold text-gray-800">Stitch</h1>
        </div>
        <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <MoreVertical size={20} className="text-gray-500" />
        </button>
      </div>

      {/* Search Bar */}
      <div className="px-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search chats..."
            className="w-full bg-gray-100 border-none rounded-2xl py-2 pl-10 pr-4 focus:ring-2 focus:ring-stitch outline-none text-sm transition-all"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            No conversations found
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
                  "px-4 py-3 flex items-center gap-3 cursor-pointer transition-all hover:bg-gray-50",
                  isActive && "bg-stitch/10 border-r-4 border-stitch"
                )}
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium overflow-hidden border-2 border-white shadow-sm">
                    {otherParticipant?.username?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-0.5">
                    <h3 className={cn(
                      "font-semibold truncate",
                      isActive ? "text-stitch-dark" : "text-gray-900"
                    )}>
                      {otherParticipant?.username || 'Unknown User'}
                    </h3>
                    <span className="text-[10px] text-gray-400 whitespace-nowrap pt-1">
                      {conv.created_at ? new Date(conv.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate line-clamp-1">
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
