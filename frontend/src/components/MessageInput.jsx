import React, { useState } from 'react';
import { Send, Image as ImageIcon, Smile, Paperclip } from 'lucide-react';

const MessageInput = ({ onSend }) => {
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim()) {
      onSend(text);
      setText('');
    }
  };

  return (
    <form 
      onSubmit={handleSubmit}
      className="p-4 bg-white border-t flex items-center gap-2 sticky bottom-0"
    >
      <div className="flex items-center gap-1">
        <button type="button" className="p-2 text-gray-400 hover:text-stitch transition-colors rounded-full hover:bg-gray-100">
          <Paperclip size={20} />
        </button>
        <button type="button" className="p-2 text-gray-400 hover:text-stitch transition-colors rounded-full hover:bg-gray-100">
          <ImageIcon size={20} />
        </button>
      </div>
      
      <div className="flex-1 relative">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          className="w-full bg-gray-100 border-none rounded-2xl py-3 pl-4 pr-12 focus:ring-2 focus:ring-stitch outline-none transition-all text-sm"
        />
        <button 
          type="button" 
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-stitch transition-colors"
        >
          <Smile size={20} />
        </button>
      </div>

      <button
        type="submit"
        disabled={!text.trim()}
        className="p-3 bg-stitch text-white rounded-2xl shadow-md shadow-stitch/30 hover:bg-stitch-dark active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none"
      >
        <Send size={20} />
      </button>
    </form>
  );
};

export default MessageInput;
