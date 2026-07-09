import { create } from 'zustand';
import { axiosInstance } from '../lib/axios';
import { useAuthStore } from './useAuthStore';
import { useNotificationStore } from './useNotificationStore';


const processedMessages = new Set();

const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    // First D5 warm tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
    gain1.gain.setValueAtTime(0.08, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start();
    osc1.stop(ctx.currentTime + 0.12);

    // Second ascending A5 tone shortly after
    setTimeout(() => {
      if (ctx.state === 'closed') return;
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, ctx.currentTime);
      gain2.gain.setValueAtTime(0.08, ctx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc2.start();
      osc2.stop(ctx.currentTime + 0.22);
    }, 65);
  } catch (err) {
    console.error('Audio playback error:', err);
  }
};

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
      if (message && message._id) {
        processedMessages.add(message._id);
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

      if (!latestMessage) return;

      const authUser = useAuthStore.getState().authUser;
      const senderId = typeof latestMessage.sender === 'object' ? latestMessage.sender._id : latestMessage.sender;

      // Play sound and trigger notifications only for other users' new messages
      if (authUser && senderId && senderId !== authUser._id) {
        if (processedMessages.has(latestMessage._id)) return;
        processedMessages.add(latestMessage._id);

        const { selectedConversation, conversations } = get();
        const isCurrentChatOpen = selectedConversation?._id === conversationId;
        const senderName = typeof latestMessage.sender === 'object' ? latestMessage.sender.username : 'Someone';
        const senderAvatar = typeof latestMessage.sender === 'object' ? latestMessage.sender.avatar : '';
        const messagePreview = latestMessage.content;
        const targetConv = conversations.find((c) => c._id === conversationId) || { _id: conversationId, participants: [], isGroup: false };

        // 1. Play chime sound
        playNotificationSound();

        // 2. Manage notification displays
        if (!isCurrentChatOpen) {
          // Display in-app notification banner
          useNotificationStore.getState().showInAppNotification(senderName, senderAvatar, messagePreview, targetConv);

          // Display desktop notification if tab is hidden/minimized
          if (document.visibilityState !== 'visible' && 'Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification(senderName, {
              body: messagePreview,
              icon: senderAvatar || undefined,
            });
            notification.onclick = () => {
              window.focus();
              get().setSelectedConversation(targetConv);
            };
          }
        } else {
          // Active chat open but tab hidden/minimized
          if (document.visibilityState !== 'visible' && 'Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification(senderName, {
              body: messagePreview,
              icon: senderAvatar || undefined,
            });
            notification.onclick = () => {
              window.focus();
              get().setSelectedConversation(selectedConversation);
            };
          }
        }
      }
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
