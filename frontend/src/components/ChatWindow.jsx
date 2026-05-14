import React, { useEffect, useRef } from 'react';
import { Phone, Video, Info, MoreHorizontal } from 'lucide-react';
import useStore from '../store/useStore';
import useChat from '../hooks/useChat';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';

const ChatWindow = () => {
  const { currentConversationId, conversations, messages, user } = useStore();
  const { sendMessage } = useChat(currentConversationId);
  const scrollRef = useRef(null);

  const conversation = conversations.find(c => c.id === currentConversationId);
  const otherParticipant = conversation?.participants.find(p => p.id !== user?.id);
  const currentMessages = messages[currentConversationId] || [];

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentMessages]);

  if (!currentConversationId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 p-8 text-center">
        <div className="w-24 h-24 bg-stitch/10 rounded-full flex items-center justify-center mb-6 animate-pulse">
          <img src="https://stitch.withgoogle.com/static/images/logo.png" alt="Stitch Logo" className="w-12 h-12 opacity-50" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to Stitch</h2>
        <p className="text-gray-500 max-w-xs">Select a conversation from the sidebar to start chatting in real-time.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white relative">
      {/* Chat Header */}
      <div className="p-4 border-b flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold overflow-hidden border-2 border-white shadow-sm">
            {otherParticipant?.username?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <h2 className="font-bold text-gray-900 leading-none mb-1">
              {otherParticipant?.username || 'Chat'}
            </h2>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Active Now</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <button className="p-2.5 text-gray-400 hover:text-stitch transition-colors rounded-full hover:bg-gray-100">
            <Phone size={20} />
          </button>
          <button className="p-2.5 text-gray-400 hover:text-stitch transition-colors rounded-full hover:bg-gray-100">
            <Video size={20} />
          </button>
          <button className="p-2.5 text-gray-400 hover:text-stitch transition-colors rounded-full hover:bg-gray-100">
            <Info size={20} />
          </button>
        </div>
      </div>

      {/* Message Feed */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 flex flex-col bg-[#FDFDFF]"
      >
        {/* Date Separator */}
        <div className="flex justify-center mb-8 sticky top-2 z-0">
          <span className="bg-white/90 border border-gray-100 text-[10px] font-bold text-gray-400 px-3 py-1 rounded-full uppercase tracking-widest shadow-sm backdrop-blur-sm">
            Today
          </span>
        </div>

        {currentMessages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-gray-300 italic text-sm">
            No messages yet. Say hi!
          </div>
        ) : (
          currentMessages.map((msg, idx) => (
            <MessageBubble 
              key={msg.id || idx} 
              message={msg} 
              isOwn={msg.sender_id === user?.id} 
            />
          ))
        )}
      </div>

      {/* Message Input */}
      <MessageInput onSend={(text) => sendMessage(text)} />
    </div>
  );
};

export default ChatWindow;
