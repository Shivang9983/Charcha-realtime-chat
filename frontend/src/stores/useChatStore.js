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

const areMessagesEqual = (msgsA, msgsB) => {
  if (!msgsA || !msgsB) return false;
  if (msgsA.length !== msgsB.length) return false;
  for (let i = 0; i < msgsA.length; i++) {
    const a = msgsA[i];
    const b = msgsB[i];
    if (a._id !== b._id) return false;
    if (a.content !== b.content) return false;
    if (a.isEdited !== b.isEdited) return false;
    if (a.isDeleted !== b.isDeleted) return false;
    if ((a.readBy?.length || 0) !== (b.readBy?.length || 0)) return false;
    
    // Check sender
    const aSender = a.sender ? String(typeof a.sender === 'object' ? a.sender?._id : a.sender) : null;
    const bSender = b.sender ? String(typeof b.sender === 'object' ? b.sender?._id : b.sender) : null;
    if (aSender !== bSender) return false;

    // Check replyTo
    const aReply = a.replyTo ? String(typeof a.replyTo === 'object' ? a.replyTo?._id : a.replyTo) : null;
    const bReply = b.replyTo ? String(typeof b.replyTo === 'object' ? b.replyTo?._id : b.replyTo) : null;
    if (aReply !== bReply) return false;
  }
  return true;
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
  cachedMessages: {},
  onlineUserProfiles: [],

  setReplyingToMessage: (message) => set({ replyingToMessage: message }),

  getOnlineUserProfiles: async () => {
    try {
      const res = await axiosInstance.get('/users/online');
      set({ onlineUserProfiles: res.data });
    } catch (error) {
      console.log('Error getting online user profiles:', error);
    }
  },

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
    const hasCache = get().cachedMessages && get().cachedMessages[conversationId];
    if (!hasCache) {
      set({ isMessagesLoading: true });
    }
    try {
      const res = await axiosInstance.get(`/messages/${conversationId}`);
      
      // Prevent race conditions: check if the loaded conversation is still selected
      if (get().selectedConversation?._id !== conversationId) {
        set((state) => ({
          cachedMessages: {
            ...state.cachedMessages,
            [conversationId]: res.data,
          },
        }));
        return;
      }

      const currentMessages = get().messages;
      const isDifferent = !areMessagesEqual(currentMessages, res.data);

      if (isDifferent) {
        set((state) => ({
          messages: res.data,
          cachedMessages: {
            ...state.cachedMessages,
            [conversationId]: res.data,
          },
        }));
      } else {
        // Just cache fresh references without triggering store subscriber notify re-renders
        set((state) => ({
          cachedMessages: {
            ...state.cachedMessages,
            [conversationId]: res.data,
          },
        }));
      }
    } catch (error) {
      console.log('Error getting messages:', error);
    } finally {
      if (get().selectedConversation?._id === conversationId) {
        set({ isMessagesLoading: false });
      }
    }
  },

  sendMessage: async (content, fileData = null, onUploadProgress = null) => {
    const { selectedConversation, replyingToMessage } = get();
    const authUser = useAuthStore.getState().authUser;
    const tempId = `temp-${Date.now()}`;

    let optimisticMsg = null;
    if (fileData) {
      optimisticMsg = {
        _id: tempId,
        sender: authUser,
        conversationId: selectedConversation._id,
        content: content || '',
        image: fileData.image,
        imageWidth: fileData.width,
        imageHeight: fileData.height,
        createdAt: new Date().toISOString(),
        readBy: [authUser._id],
        isOptimistic: true,
        status: 'uploading',
        replyTo: replyingToMessage || null,
      };

      set((state) => {
        const updatedMessages = [...state.messages, optimisticMsg];
        return {
          messages: updatedMessages,
          cachedMessages: {
            ...state.cachedMessages,
            [selectedConversation._id]: updatedMessages,
          },
        };
      });
    }

    try {
      const payload = { content };
      if (replyingToMessage) {
        payload.replyTo = replyingToMessage._id;
      }
      if (fileData) {
        payload.image = fileData.image;
        payload.imageWidth = fileData.width;
        payload.imageHeight = fileData.height;
      }

      const res = await axiosInstance.post(`/messages/send/${selectedConversation._id}`, payload, {
        onUploadProgress: (progressEvent) => {
          if (onUploadProgress && progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onUploadProgress(percentCompleted);
          }
        },
      });

      if (fileData) {
        set((state) => {
          const updatedMessages = state.messages.map((m) =>
            m._id === tempId ? res.data : m
          );
          return {
            messages: updatedMessages,
            cachedMessages: {
              ...state.cachedMessages,
              [selectedConversation._id]: updatedMessages,
            },
          };
        });
      }
      set({ replyingToMessage: null });
    } catch (error) {
      console.log('Error sending message:', error);
      if (fileData) {
        set((state) => {
          const updatedMessages = state.messages.map((m) =>
            m._id === tempId ? { ...m, status: 'failed', retryData: { content, fileData } } : m
          );
          return {
            messages: updatedMessages,
            cachedMessages: {
              ...state.cachedMessages,
              [selectedConversation._id]: updatedMessages,
            },
          };
        });
      }
      throw error;
    }
  },

  retrySendMessage: async (tempId, content, fileData) => {
    const { selectedConversation } = get();

    set((state) => {
      const updatedMessages = state.messages.map((m) =>
        m._id === tempId ? { ...m, status: 'uploading' } : m
      );
      return {
        messages: updatedMessages,
        cachedMessages: {
          ...state.cachedMessages,
          [selectedConversation._id]: updatedMessages,
        },
      };
    });

    try {
      const payload = { content };
      if (fileData) {
        payload.image = fileData.image;
        payload.imageWidth = fileData.width;
        payload.imageHeight = fileData.height;
      }

      const res = await axiosInstance.post(`/messages/send/${selectedConversation._id}`, payload);

      set((state) => {
        const updatedMessages = state.messages.map((m) =>
          m._id === tempId ? res.data : m
        );
        return {
          messages: updatedMessages,
          cachedMessages: {
            ...state.cachedMessages,
            [selectedConversation._id]: updatedMessages,
          },
        };
      });
    } catch (error) {
      console.log('Error retrying message send:', error);
      set((state) => {
        const updatedMessages = state.messages.map((m) =>
          m._id === tempId ? { ...m, status: 'failed' } : m
        );
        return {
          messages: updatedMessages,
          cachedMessages: {
            ...state.cachedMessages,
            [selectedConversation._id]: updatedMessages,
          },
        };
      });
      throw error;
    }
  },

  editMessage: async (messageId, content) => {
    try {
      const res = await axiosInstance.put(`/messages/edit/${messageId}`, { content });
      const updatedMessages = get().messages.map((msg) =>
        msg._id === messageId ? res.data : msg
      );
      set((state) => ({
        messages: updatedMessages,
        cachedMessages: {
          ...state.cachedMessages,
          [res.data.conversationId]: updatedMessages,
        },
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
    if (String(messageId).startsWith('temp-')) {
      set((state) => {
        const updatedMessages = state.messages.filter((msg) => msg._id !== messageId);
        const convId = state.selectedConversation?._id;
        return {
          messages: updatedMessages,
          cachedMessages: convId ? {
            ...state.cachedMessages,
            [convId]: updatedMessages,
          } : state.cachedMessages,
        };
      });
      useToastStore.getState().addToast('Optimistic message removed', 'success');
      return;
    }
    try {
      const res = await axiosInstance.post(`/messages/delete/${messageId}`, { deleteType });
      if (deleteType === 'me') {
        const updatedMessages = get().messages.filter((msg) => msg._id !== messageId);
        const msg = get().messages.find((m) => m._id === messageId);
        const convId = msg?.conversationId;
        set((state) => ({
          messages: updatedMessages,
          cachedMessages: convId ? {
            ...state.cachedMessages,
            [convId]: updatedMessages,
          } : state.cachedMessages,
        }));
        useToastStore.getState().addToast('Message deleted for me', 'success');
      } else {
        const updatedMessages = get().messages.map((msg) =>
          msg._id === messageId ? res.data : msg
        );
        set((state) => ({
          messages: updatedMessages,
          cachedMessages: {
            ...state.cachedMessages,
            [res.data.conversationId]: updatedMessages,
          },
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

    if (previousConversation?._id === selectedConversation?._id) {
      return; // Skip redundant updates if clicking the same chat
    }

    const cached = selectedConversation ? get().cachedMessages[selectedConversation._id] || [] : [];
    const hasCache = selectedConversation && get().cachedMessages[selectedConversation._id];

    set({
      selectedConversation,
      messages: cached,
      replyingToMessage: null,
      isMessagesLoading: selectedConversation && !hasCache ? true : false
    });

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

    // Clean up first to prevent duplicate listeners
    get().unsubscribeFromMessages();

    socket.on('newMessage', (message) => {
      const { selectedConversation, messages } = get();
      const authUser = useAuthStore.getState().authUser;
      const isFromMe = authUser && String(typeof message.sender === 'object' ? message.sender._id : message.sender) === String(authUser._id);

      if (selectedConversation && message.conversationId === selectedConversation._id) {
        if (messages.some((msg) => msg._id === message._id)) return;

        // Sync optimistic message if socket event arrives first
        if (isFromMe) {
          const optIndex = messages.findIndex((msg) => msg.isOptimistic && msg.status === 'uploading');
          if (optIndex !== -1) {
            const updatedMessages = [...messages];
            updatedMessages[optIndex] = message;
            set({ messages: updatedMessages });
            set((state) => ({
              cachedMessages: {
                ...state.cachedMessages,
                [message.conversationId]: updatedMessages,
              },
            }));
            return;
          }
        }

        const updatedMessages = [...messages, message];
        set({ messages: updatedMessages });
        set((state) => ({
          cachedMessages: {
            ...state.cachedMessages,
            [message.conversationId]: updatedMessages,
          },
        }));
      } else {
        // Update cache for background conversation
        const convId = message.conversationId;
        const cached = get().cachedMessages[convId] || [];
        if (!cached.some((msg) => msg._id === message._id)) {
          set((state) => ({
            cachedMessages: {
              ...state.cachedMessages,
              [convId]: [...cached, message],
            },
          }));
        }
      }
      if (message && message._id) {
        processedMessages.add(message._id);
      }
    });

    socket.on('messageUpdated', (updatedMessage) => {
      const { selectedConversation, messages } = get();
      const authUser = useAuthStore.getState().authUser;
      const isDeletedForMe = updatedMessage.deletedFor?.some(
        (id) => (typeof id === 'object' ? id._id : id).toString() === authUser?._id?.toString()
      );

      // Update selected messages
      if (selectedConversation && updatedMessage.conversationId === selectedConversation._id) {
        let updatedMessages;
        if (isDeletedForMe) {
          updatedMessages = messages.filter((msg) => msg._id !== updatedMessage._id);
        } else {
          updatedMessages = messages.map((msg) =>
            msg._id === updatedMessage._id ? updatedMessage : msg
          );
        }
        set({ messages: updatedMessages });
      }

      // Update cache
      const convId = updatedMessage.conversationId;
      const cached = get().cachedMessages[convId] || [];
      let updatedCached;
      if (isDeletedForMe) {
        updatedCached = cached.filter((msg) => msg._id !== updatedMessage._id);
      } else {
        updatedCached = cached.map((msg) =>
          msg._id === updatedMessage._id ? updatedMessage : msg
        );
      }
      set((state) => ({
        cachedMessages: {
          ...state.cachedMessages,
          [convId]: updatedCached,
        },
      }));
    });

    socket.on('messagesRead', ({ conversationId, readBy }) => {
      const { selectedConversation, messages } = get();
      const readByStr = String(readBy);

      if (selectedConversation && selectedConversation._id === conversationId) {
        const updatedMessages = messages.map((msg) => {
          const senderIdStr = String(typeof msg.sender === 'object' ? msg.sender?._id : msg.sender);
          const hasRead = msg.readBy.some((id) => String(typeof id === 'object' ? id?._id : id) === readByStr);
          if (senderIdStr !== readByStr && !hasRead) {
            return { ...msg, readBy: [...msg.readBy, readBy] };
          }
          return msg;
        });
        set((state) => ({
          messages: updatedMessages,
          cachedMessages: {
            ...state.cachedMessages,
            [conversationId]: updatedMessages,
          },
        }));
      } else {
        // Update cache for background conversation
        const cached = get().cachedMessages[conversationId] || [];
        const updatedCached = cached.map((msg) => {
          const senderIdStr = String(typeof msg.sender === 'object' ? msg.sender?._id : msg.sender);
          const hasRead = msg.readBy.some((id) => String(typeof id === 'object' ? id?._id : id) === readByStr);
          if (senderIdStr !== readByStr && !hasRead) {
            return { ...msg, readBy: [...msg.readBy, readBy] };
          }
          return msg;
        });
        set((state) => ({
          cachedMessages: {
            ...state.cachedMessages,
            [conversationId]: updatedCached,
          },
        }));
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
        const messagePreview = latestMessage.content || (latestMessage.image ? '📷 Photo' : '');
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
