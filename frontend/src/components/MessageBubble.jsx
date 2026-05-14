import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...inputs) => twMerge(clsx(inputs));

const MessageBubble = ({ message, isOwn }) => {
  const timestamp = new Date(message.timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  return (
    <div className={cn(
      "flex flex-col mb-4 max-w-[80%]",
      isOwn ? "ml-auto items-end" : "mr-auto items-start"
    )}>
      <div className={cn(
        "px-4 py-2.5 rounded-2xl shadow-sm text-sm leading-relaxed",
        isOwn 
          ? "bg-stitch text-white rounded-br-none" 
          : "bg-gray-100 text-gray-800 rounded-bl-none border border-gray-200"
      )}>
        {message.text}
        
        {message.image_url && (
          <img 
            src={message.image_url} 
            alt="Sent attachment" 
            className="mt-2 rounded-xl max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
          />
        )}
      </div>
      
      <span className="text-[10px] text-gray-400 mt-1 px-1">
        {timestamp}
      </span>
    </div>
  );
};

export default MessageBubble;
