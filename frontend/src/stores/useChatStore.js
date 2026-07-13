import { create } from 'zustand';
import { axiosInstance } from '../lib/axios';
import { useAuthStore } from './useAuthStore';
import { useNotificationStore } from './useNotificationStore';
import { useToastStore } from './useToastStore';


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
  replyingToMessage: null,
  unreadCounts: {},

  setReplyingToMessage: (message) => set({ replyingToMessage: message }),

  getConversations: async () => {
    set({ isConversationsLoading: true });
    try {
      const res = await axiosInstance.get('/messages/conversations');
      const conversations = res.data;

      // Initialize unread counts based on latestMessage
      const authUser = useAuthStore.getState().authUser;
      const initialUnread = {};
      conversations.forEach((conv) => {
        const latestMsg = conv.latestMessage;
        if (latestMsg) {
          const senderId = typeof latestMsg.sender === 'object' ? latestMsg.sender._id : latestMsg.sender;
          const isUnread = authUser && senderId !== authUser._id && !latestMsg.readBy.includes(authUser._id);
          if (isUnread) {
            initialUnread[conv._id] = 1;
          }
        }
      });

      set({ conversations, unreadCounts: { ...initialUnread, ...get().unreadCounts } });
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
    const { selectedConversation, replyingToMessage } = get();
    try {
      const payload = { content };
      if (replyingToMessage) {
        payload.replyTo = replyingToMessage._id;
      }
      await axiosInstance.post(`/messages/send/${selectedConversation._id}`, payload);
      set({ replyingToMessage: null });
    } catch (error) {
      console.log('Error sending message:', error);
    }
  },

  editMessage: async (messageId, content) => {
    try {
      const res = await axiosInstance.put(`/messages/edit/${messageId}`, { content });
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId ? res.data : msg
        ),
      }));
      useToastStore.getState().addToast('Message edited successfully', 'success');
    } catch (error) {
      console.log('Error editing message:', error);
      const errMsg = error.response?.data?.error || 'Failed to edit message';
      useToastStore.getState().addToast(errMsg, 'error');
      throw error;
    }
  },

  deleteMessage: async (messageId, deleteType) => {
    try {
      const res = await axiosInstance.post(`/messages/delete/${messageId}`, { deleteType });
      if (deleteType === 'me') {
        set((state) => ({
          messages: state.messages.filter((msg) => msg._id !== messageId),
        }));
        useToastStore.getState().addToast('Message deleted for me', 'success');
      } else {
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg._id === messageId ? res.data : msg
          ),
        }));
        useToastStore.getState().addToast('Message deleted for everyone', 'success');
      }
    } catch (error) {
      console.log('Error deleting message:', error);
      const errMsg = error.response?.data?.error || 'Failed to delete message';
      useToastStore.getState().addToast(errMsg, 'error');
      throw error;
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

    set({ selectedConversation, messages: [], replyingToMessage: null });

    if (selectedConversation) {
      set((state) => ({
        unreadCounts: {
          ...state.unreadCounts,
          [selectedConversation._id]: 0,
        },
      }));
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

    socket.on('messageUpdated', (updatedMessage) => {
      const { selectedConversation, messages } = get();
      if (selectedConversation && updatedMessage.conversationId === selectedConversation._id) {
        const authUser = useAuthStore.getState().authUser;
        const isDeletedForMe = updatedMessage.deletedFor?.some(
          (id) => (typeof id === 'object' ? id._id : id).toString() === authUser?._id?.toString()
        );

        if (isDeletedForMe) {
          set({ messages: messages.filter((msg) => msg._id !== updatedMessage._id) });
        } else {
          set({
            messages: messages.map((msg) =>
              msg._id === updatedMessage._id ? updatedMessage : msg
            ),
          });
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

      if (!latestMessage) return;

      const authUser = useAuthStore.getState().authUser;
      const senderId = typeof latestMessage.sender === 'object' ? latestMessage.sender._id : latestMessage.sender;

      // Play sound and trigger notifications only for other users' incoming messages
      if (authUser && senderId && senderId !== authUser._id) {
        const { selectedConversation, conversations } = get();
        const isCurrentChatOpen = selectedConversation?._id === conversationId;
        const senderName = typeof latestMessage.sender === 'object' ? latestMessage.sender.username : 'Someone';
        const senderAvatar = typeof latestMessage.sender === 'object' ? latestMessage.sender.avatar : '';
        const messagePreview = latestMessage.content;
        const targetConv = conversations.find((c) => c._id === conversationId) || { _id: conversationId, participants: [], isGroup: false };

        // Prevent duplicate sound/notification triggers
        const notificationKey = `notif_${latestMessage._id}`;
        if (processedMessages.has(notificationKey)) return;
        processedMessages.add(notificationKey);

        // 1. Play chime sound for all incoming messages
        playNotificationSound();

        // 2. Manage notification displays
        if (!isCurrentChatOpen) {
          // Increment unread count for this conversation
          const currentUnread = get().unreadCounts[conversationId] || 0;
          set((state) => ({
            unreadCounts: {
              ...state.unreadCounts,
              [conversationId]: currentUnread + 1,
            },
          }));

          // Display in-app notification banner
          useNotificationStore.getState().showInAppNotification(senderName, senderAvatar, messagePreview, targetConv);

          // Display desktop browser notification if tab is inactive
          if (document.visibilityState !== 'visible' && 'Notification' in window) {
            if (Notification.permission === 'granted') {
              const notification = new Notification(senderName, {
                body: messagePreview,
                icon: senderAvatar || undefined,
              });
              notification.onclick = () => {
                window.focus();
                get().setSelectedConversation(targetConv);
              };
            } else if (Notification.permission === 'default') {
              Notification.requestPermission();
            }
          }
        } else {
          // Active chat open but tab is inactive (visibilityState !== 'visible')
          if (document.visibilityState !== 'visible' && 'Notification' in window) {
            if (Notification.permission === 'granted') {
              const notification = new Notification(senderName, {
                body: messagePreview,
                icon: senderAvatar || undefined,
              });
              notification.onclick = () => {
                window.focus();
                get().setSelectedConversation(selectedConversation);
              };
            } else if (Notification.permission === 'default') {
              Notification.requestPermission();
            }
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
    socket.off('messageUpdated');
  },
}));
