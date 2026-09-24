import http from 'http';
import { Server } from 'socket.io';
import express from 'express';
import { parse as parseCookie } from 'cookie';

import { verifyAuthToken } from './middleware/auth.middleware.js';
import Conversation from './models/conversation.model.js';
import { registerCallHandlers } from './callSignaling.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const userSocketMap = {};

export const getReceiverSocketId = (receiverId) => {
  return userSocketMap[receiverId];
};

export const getOnlineUserIds = () => {
  return Object.keys(userSocketMap);
};

io.use(async (socket, next) => {
  try {
    const cookieHeader = socket.handshake.headers.cookie;
    const token = cookieHeader ? parseCookie(cookieHeader).jwt : null;

    const user = await verifyAuthToken(token);
    if (!user) {
      return next(new Error('Unauthorized'));
    }

    socket.data.userId = user._id.toString();
    socket.data.username = user.username;
    next();
  } catch (error) {
    next(new Error('Unauthorized'));
  }
});

io.on('connection', (socket) => {
  const { userId, username } = socket.data;
  console.log('A user connected:', socket.id, 'user:', userId);

  userSocketMap[userId] = socket.id;
  io.emit('getOnlineUsers', Object.keys(userSocketMap));

  registerCallHandlers(io, socket, getReceiverSocketId);

  socket.on('joinConversation', async (conversationId) => {
    try {
      const isParticipant = await Conversation.exists({
        _id: conversationId,
        participants: userId,
      });
      if (!isParticipant) return;

      socket.join(conversationId);
    } catch (error) {
      console.error('Error joining conversation room:', error.message);
    }
  });

  socket.on('leaveConversation', (conversationId) => {
    socket.leave(conversationId);
  });

  socket.on('typing', ({ conversationId }) => {
    socket.to(conversationId).emit('typing', { conversationId, userId, username });
  });

  socket.on('stopTyping', ({ conversationId }) => {
    socket.to(conversationId).emit('stopTyping', { conversationId, userId });
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
   
    if (userSocketMap[userId] === socket.id) {
      delete userSocketMap[userId];
      io.emit('getOnlineUsers', Object.keys(userSocketMap));
    }
  });
});

export { app, io, server };
