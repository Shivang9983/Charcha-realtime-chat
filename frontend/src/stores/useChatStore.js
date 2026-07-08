import { create } from 'zustand';
import { axiosInstance } from '../lib/axios';
import { useAuthStore } from './useAuthStore';

export const useChatStore = create((set, get) => ({
  conversations: [],
  messages: [],
  selectedConversation: null,
  isConversationsLoading: false,
  isMessagesLoading: false,
  typingStatus: {}, // Structure: { [conversationId]: { [userId]: username } }

  getConversations: async () => {
    set({ isConversationsLoading: true });
    try {
      const res = await axiosInstance.get('/messages/conversations');
      set({ conversations: res.data });
    } catch (error) {
      console.log('Error getting conversations:', error);
    } finally {
      set({ isConversationsLoading: false });
    }
  },

  getMessages: async (conversationId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${conversationId}`);
      set({ messages: res.data });
    } catch (error) {
      console.log('Error getting messages:', error);
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (content) => {
    const { selectedConversation } = get();
    try {
      await axiosInstance.post(`/messages/send/${selectedConversation._id}`, { content });
    } catch (error) {
      console.log('Error sending message:', error);
    }
  },

  startConversation: async (data) => {
    try {
      const res = await axiosInstance.post('/messages/conversations', data);
      const newConv = res.data;

      set((state) => {
        const exists = state.conversations.find((c) => c._id === newConv._id);
        if (exists) return {};
        return { conversations: [newConv, ...state.conversations] };
      });

      return newConv;
    } catch (error) {
      console.log('Error starting conversation:', error);
      return null;
    }
  },

  setSelectedConversation: (selectedConversation) => {
    const { socket } = useAuthStore.getState();
    const previousConversation = get().selectedConversation;

    if (previousConversation && socket) {
      socket.emit('leaveConversation', previousConversation._id);
    }

    set({ selectedConversation, messages: [] });

    if (selectedConversation) {
      get().getMessages(selectedConversation._id);
      if (socket) {
        socket.emit('joinConversation', selectedConversation._id);
      }
    }
  },

  subscribeToMessages: () => {
    const { socket } = useAuthStore.getState();
    if (!socket) return;

    socket.on('newMessage', (message) => {
      const { selectedConversation, messages } = get();
      if (selectedConversation && message.conversationId === selectedConversation._id) {
        if (!messages.some((msg) => msg._id === message._id)) {
          set({ messages: [...messages, message] });
        }
      }
    });

    socket.on('messagesRead', ({ conversationId, readBy }) => {
      const { selectedConversation, messages } = get();
      if (selectedConversation && selectedConversation._id === conversationId) {
        const updatedMessages = messages.map((msg) => {
          const senderId = typeof msg.sender === 'object' ? msg.sender?._id : msg.sender;
          if (senderId !== readBy && !msg.readBy.includes(readBy)) {
            return { ...msg, readBy: [...msg.readBy, readBy] };
          }
          return msg;
        });
        set({ messages: updatedMessages });
      }
    });

    socket.on('typing', ({ conversationId, userId, username }) => {
      set((state) => {
        const roomTyping = state.typingStatus[conversationId] || {};
        return {
          typingStatus: {
            ...state.typingStatus,
            [conversationId]: {
              ...roomTyping,
              [userId]: username,
            },
          },
        };
      });
    });

    socket.on('stopTyping', ({ conversationId, userId }) => {
      set((state) => {
        const roomTyping = { ...(state.typingStatus[conversationId] || {}) };
        delete roomTyping[userId];
        return {
          typingStatus: {
            ...state.typingStatus,
            [conversationId]: roomTyping,
          },
        };
      });
    });

    socket.on('newConversation', (conversation) => {
      set((state) => {
        const exists = state.conversations.some((c) => c._id === conversation._id);
        if (exists) return {};
        return { conversations: [conversation, ...state.conversations] };
      });
    });

    socket.on('conversationUpdate', ({ conversationId, latestMessage, updatedAt }) => {
      set((state) => {
        const updatedConversations = state.conversations.map((c) => {
          if (c._id === conversationId) {
            return { ...c, latestMessage, updatedAt };
          }
          return c;
        });

        // Re-sort conversation items dynamically by latest update
        updatedConversations.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

        return { conversations: updatedConversations };
      });
    });
  },

  unsubscribeFromMessages: () => {
    const { socket } = useAuthStore.getState();
    if (!socket) return;

    socket.off('newMessage');
    socket.off('messagesRead');
    socket.off('typing');
    socket.off('stopTyping');
    socket.off('newConversation');
    socket.off('conversationUpdate');
  },
}));
