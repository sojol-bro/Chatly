import { useEffect, useRef, useCallback } from 'react';
import useStore from '../store/useStore';

const useChat = (conversationId) => {
  const socketRef = useRef(null);
  const { token, addMessage } = useStore();
  
  const connect = useCallback(() => {
    if (!conversationId || !token) return;
    
    // Close existing connection if any
    if (socketRef.current) {
      socketRef.current.close();
    }
    
    const wsBase = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
    const wsUrl = `${wsBase}/ws/chat/${conversationId}/?token=${token}`;
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('WebSocket Connected');
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'chat_message') {
        addMessage(conversationId, {
          id: data.message_id,
          sender_id: data.sender_id,
          sender_username: data.sender_username,
          text: data.text,
          image_url: data.image_url,
          timestamp: data.timestamp,
          is_read: data.is_read
        });
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket Error:', error);
    };
    
    ws.onclose = (event) => {
      console.log('WebSocket Disconnected', event.code);
      // Reconnect logic could be added here
    };
    
    socketRef.current = ws;
  }, [conversationId, token, addMessage]);
  
  useEffect(() => {
    connect();
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect]);
  
  const sendMessage = (text, imageUrl = null) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        text,
        image_url: imageUrl
      }));
    } else {
      console.error('WebSocket not connected');
    }
  };
  
  return { sendMessage };
};

export default useChat;
