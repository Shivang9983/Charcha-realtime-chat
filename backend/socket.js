import http from 'http';
import { Server } from 'socket.io';
import express from 'express';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Map of userId -> socketId
const userSocketMap = {};

export const getReceiverSocketId = (receiverId) => {
  return userSocketMap[receiverId];
};

export const getOnlineUserIds = () => {
  return Object.keys(userSocketMap);
};

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  const userId = socket.handshake.query.userId;
  if (userId && userId !== 'undefined') {
    userSocketMap[userId] = socket.id;
    io.emit('getOnlineUsers', Object.keys(userSocketMap));
  }

  // Join a room for a specific conversation
  socket.on('joinConversation', (conversationId) => {
    socket.join(conversationId);
    console.log(`User ${userId} (socket: ${socket.id}) joined room: ${conversationId}`);
  });

  // Leave conversation room
  socket.on('leaveConversation', (conversationId) => {
    socket.leave(conversationId);
    console.log(`User ${userId} (socket: ${socket.id}) left room: ${conversationId}`);
  });

  // Relay typing status to others in the room
  socket.on('typing', ({ conversationId, userId, username }) => {
    socket.to(conversationId).emit('typing', { conversationId, userId, username });
  });

  // Relay stop typing status
  socket.on('stopTyping', ({ conversationId, userId }) => {
    socket.to(conversationId).emit('stopTyping', { conversationId, userId });
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
    if (userId && userId !== 'undefined') {
      delete userSocketMap[userId];
      io.emit('getOnlineUsers', Object.keys(userSocketMap));
    }
  });
});

export { app, io, server };
