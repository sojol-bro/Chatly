import { create } from 'zustand';

const useStore = create((set) => ({
  user: null,
  token: null,
  conversations: [],
  currentConversationId: null,
  messages: {}, // { conversationId: [messages] }
  
  setAuth: (user, token) => set({ user, token }),
  logout: () => set({ user: null, token: null, conversations: [], currentConversationId: null, messages: {} }),
  
  setConversations: (conversations) => set({ conversations }),
  setCurrentConversation: (id) => set({ currentConversationId: id }),
  
  setMessages: (conversationId, messages) => 
    set((state) => ({ 
      messages: { ...state.messages, [conversationId]: messages } 
    })),
    
  addMessage: (conversationId, message) => 
    set((state) => {
      const convMessages = state.messages[conversationId] || [];
      // Avoid duplicates if message already exists
      if (convMessages.find(m => m.id === message.id)) return state;
      
      return {
        messages: {
          ...state.messages,
          [conversationId]: [...convMessages, message]
        }
      };
    }),
}));

export default useStore;
